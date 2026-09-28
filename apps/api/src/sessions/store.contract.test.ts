import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createMemorySessionStore } from "./memory-store.js";
import { createRedisSessionStore } from "./redis-store.js";
import type { SessionRecord, SessionStore } from "./store.js";
import { connectTestRedis } from "./test-redis.js";

const redis = await connectTestRedis();
const redisPrefix = `test:${randomUUID()}:`;

afterAll(async () => {
  if (!redis) return;
  const keys = await redis.keys(`${redisPrefix}*`);
  if (keys.length > 0) await redis.del(keys);
  await redis.close();
});

const session = (overrides: Partial<SessionRecord> = {}): SessionRecord => ({
  id: randomUUID(),
  roomCode: "KWPX",
  status: "lobby",
  hostTokenHash: "hash",
  createdAt: Date.now(),
  ...overrides,
});

const inAMinute = () => Date.now() + 60_000;
const CLOCK_DRIFT_MS = 1000;
const imageLimits = (maxPerSession: number) => ({
  maxPerSession,
  maxActive: 1000,
  expiresAt: inAMinute(),
  leaseUntil: Date.now() + 5 * 60_000,
  uploadedAt: 1_000,
});

const imageIds = async (store: SessionStore, sessionId: string) =>
  (await store.listImages(sessionId)).map((image) => image.id).toSorted();

const stores: [string, (() => SessionStore) | undefined][] = [
  ["memory", () => createMemorySessionStore()],
  ["redis", redis ? () => createRedisSessionStore(redis, `${redisPrefix}${randomUUID()}:`) : undefined],
];

describe.each(stores)("%s session store", (name, makeStore) => {
  const run = makeStore ? it : it.skip;

  run("finds a created session by its room code", async () => {
    const store = makeStore?.() as SessionStore;
    const created = session();

    await store.create(created, inAMinute());

    expect(await store.findByRoomCode("KWPX")).toEqual(created);
  });

  run("refuses a room code that is already in use", async () => {
    const store = makeStore?.() as SessionStore;
    await store.create(session(), inAMinute());

    expect(await store.create(session(), inAMinute())).toBe("room_code_taken");
  });

  const player = (name: string, joinedAt = Date.now()) => ({ id: randomUUID(), name, tokenHash: "hash", joinedAt });
  const joinOptions = (nameKey: string, maxPlayers = 100) => ({ nameKey, maxPlayers, expiresAt: inAMinute() });

  run("adds players and lists them in join order", async () => {
    const store = makeStore?.() as SessionStore;
    const created = session();
    await store.create(created, inAMinute());
    const first = player("Priya", 1);
    const second = player("Daan", 2);

    expect(await store.addPlayer(created.id, second, joinOptions("daan"))).toBe("added");
    expect(await store.addPlayer(created.id, first, joinOptions("priya"))).toBe("added");

    expect(await store.listPlayers(created.id)).toEqual([first, second]);
    expect(await store.findPlayer(created.id, first.id)).toEqual(first);
  });

  run("refuses a name key that is already taken", async () => {
    const store = makeStore?.() as SessionStore;
    const created = session();
    await store.create(created, inAMinute());
    await store.addPlayer(created.id, player("Priya"), joinOptions("priya"));

    expect(await store.addPlayer(created.id, player("PRIYA"), joinOptions("priya"))).toBe("name_taken");
  });

  run("refuses players beyond the limit", async () => {
    const store = makeStore?.() as SessionStore;
    const created = session();
    await store.create(created, inAMinute());
    await store.addPlayer(created.id, player("A"), joinOptions("a", 2));
    await store.addPlayer(created.id, player("B"), joinOptions("b", 2));

    expect(await store.addPlayer(created.id, player("C"), joinOptions("c", 2))).toBe("session_full");
    expect(await store.listPlayers(created.id)).toHaveLength(2);
  });

  run("refuses players for an unknown session", async () => {
    const store = makeStore?.() as SessionStore;

    expect(await store.addPlayer(randomUUID(), player("A"), joinOptions("a"))).toBe("session_not_found");
  });

  run("stores avatars byte for byte and reports their versions", async () => {
    const store = makeStore?.() as SessionStore;
    const created = session();
    await store.create(created, inAMinute());
    const priya = player("Priya");
    await store.addPlayer(created.id, priya, joinOptions("priya"));
    const bytes = Buffer.from([0, 255, 13, 10, 0x80, 0xff, 0x00, 42]);

    expect(await store.setAvatar(created.id, priya.id, { bytes, type: "image/webp", version: 7 }, inAMinute())).toBe(
      "saved",
    );

    const avatar = await store.getAvatar(created.id, priya.id);
    expect(avatar?.bytes.equals(bytes)).toBe(true);
    expect(avatar?.type).toBe("image/webp");
    expect(await store.avatarVersions(created.id)).toEqual(new Map([[priya.id, 7]]));
  });

  run("refuses avatars for unknown players or sessions", async () => {
    const store = makeStore?.() as SessionStore;
    const created = session();
    await store.create(created, inAMinute());
    const avatar = { bytes: Buffer.from([1]), type: "image/webp" as const, version: 1 };

    expect(await store.setAvatar(created.id, randomUUID(), avatar, inAMinute())).toBe("player_not_found");
    expect(await store.setAvatar(randomUUID(), randomUUID(), avatar, inAMinute())).toBe("session_not_found");
  });

  run("updates the status of a session", async () => {
    const store = makeStore?.() as SessionStore;
    const created = session();
    await store.create(created, inAMinute());

    expect(await store.setStatus(created.id, "playing")).toBe(true);
    expect((await store.findById(created.id))?.status).toBe("playing");
    expect(await store.setStatus(randomUUID(), "playing")).toBe(false);
  });

  run("returns null for an unknown room code", async () => {
    const store = makeStore?.() as SessionStore;

    expect(await store.findByRoomCode("ZZZZ")).toBeNull();
  });

  run("does not bring an expired session back through setStatus or touch", async () => {
    const store = makeStore?.() as SessionStore;
    const created = session();
    await store.create(created, Date.now() + 50);
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(await store.setStatus(created.id, "playing")).toBe(false);
    await store.touch(created, inAMinute());
    expect(await store.findById(created.id)).toBeNull();
  });

  run("expires players together with their session", async () => {
    const store = makeStore?.() as SessionStore;
    const created = session();
    await store.create(created, Date.now() + 50);
    await store.addPlayer(created.id, player("Priya"), {
      nameKey: "priya",
      maxPlayers: 100,
      expiresAt: Date.now() + 50,
    });
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(await store.listPlayers(created.id)).toEqual([]);
    expect(await store.findByRoomCode(created.roomCode)).toBeNull();
  });

  run("stores the setup while the session is in the lobby, and locks it afterwards", async () => {
    const store = makeStore?.() as SessionStore;
    const created = session();
    await store.create(created, inAMinute());

    expect(await store.getSetup(created.id)).toBeNull();
    expect(await store.getLobbySummary(created.id)).toBeNull();
    expect(await store.saveSetup(created.id, '{"name":"Friday"}', "summary-1", inAMinute())).toBe("changed");
    expect(await store.saveSetup(created.id, '{"name":"Friday!"}', "summary-1", inAMinute())).toBe("unchanged");
    expect(await store.getSetup(created.id)).toBe('{"name":"Friday!"}');
    expect(await store.getLobbySummary(created.id)).toBe("summary-1");
    expect(await store.findById(created.id)).toEqual(created);

    await store.setStatus(created.id, "playing");
    expect(await store.saveSetup(created.id, '{"name":"Later"}', "summary-2", inAMinute())).toBe("setup_locked");
    expect(await store.getSetup(created.id)).toBe('{"name":"Friday!"}');
    expect(await store.saveSetup(randomUUID(), "{}", "summary", inAMinute())).toBe("session_not_found");
  });

  run("keeps track of the images of a session while its setup is open", async () => {
    const store = makeStore?.() as SessionStore;
    const created = session();
    await store.create(created, inAMinute());

    expect(await store.listImages(created.id)).toEqual([]);
    expect(await store.addImage(created.id, "a", imageLimits(2))).toBe("added");
    expect(await store.addImage(created.id, "b", { ...imageLimits(2), uploadedAt: 2_000 })).toBe("added");
    expect(await store.addImage(created.id, "a", { ...imageLimits(2), uploadedAt: 3_000 })).toBe("added");
    expect(await store.addImage(created.id, "c", imageLimits(2))).toBe("limit_reached");
    expect((await store.listImages(created.id)).toSorted((x, y) => x.uploadedAt - y.uploadedAt)).toEqual([
      { id: "a", uploadedAt: 1_000 },
      { id: "b", uploadedAt: 2_000 },
    ]);

    await store.removeImages(created.id, ["a"]);
    expect(await imageIds(store, created.id)).toEqual(["b"]);
    expect(await store.addImage(created.id, "c", imageLimits(2))).toBe("added");
    await store.removeImages(created.id, []);

    await store.setStatus(created.id, "playing");
    expect(await store.addImage(created.id, "d", imageLimits(5))).toBe("setup_locked");
    expect(await store.addImage(randomUUID(), "e", imageLimits(5))).toBe("session_not_found");
    expect(await imageIds(store, created.id)).toEqual(["b", "c"]);
  });

  run("stops accepting images once the whole server holds its maximum", async () => {
    const store = makeStore?.() as SessionStore;
    const first = session();
    const second = session({ roomCode: "ABCD" });
    await store.create(first, inAMinute());
    await store.create(second, inAMinute());
    const tight = { ...imageLimits(5), maxActive: 2 };

    expect(await store.addImage(first.id, "a", tight)).toBe("added");
    expect(await store.addImage(second.id, "b", tight)).toBe("added");
    expect(await store.addImage(first.id, "a", tight)).toBe("added");
    expect(await store.addImage(second.id, "c", tight)).toBe("storage_full");

    await store.removeImages(first.id, ["a"]);
    expect(await store.addImage(second.id, "c", tight)).toBe("added");
    expect(await store.addImage(first.id, "d", { ...tight, maxActive: 3 })).toBe("added");

    await store.releaseImages(first.id);
    expect(await store.listImages(first.id)).toEqual([]);
    expect(await imageIds(store, second.id)).toEqual(["b", "c"]);
    expect(await store.addImage(second.id, "e", { ...tight, maxActive: 3 })).toBe("added");
    expect(await store.addImage(second.id, "f", { ...tight, maxActive: 3 })).toBe("storage_full");
  });

  run("frees the server-wide image slots once their lease ends", async () => {
    const store = makeStore?.() as SessionStore;
    const created = session();
    await store.create(created, inAMinute());
    const shortLease = { ...imageLimits(5), maxActive: 1, leaseUntil: Date.now() + 50 };

    expect(await store.addImage(created.id, "a", shortLease)).toBe("added");
    expect(await store.addImage(created.id, "b", shortLease)).toBe("storage_full");
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(await store.addImage(created.id, "b", shortLease)).toBe("added");
  });

  run("saves game state only on top of the version it was based on", async () => {
    const store = makeStore?.() as SessionStore;
    const created = session();
    await store.create(created, inAMinute());

    expect(await store.getGame(created.id)).toBeNull();
    expect(await store.saveGame(created.id, null, "first", inAMinute())).toBe("saved");
    expect(await store.saveGame(created.id, null, "again", inAMinute())).toBe("conflict");
    expect(await store.saveGame(created.id, 2, "ahead", inAMinute())).toBe("conflict");
    expect(await store.saveGame(created.id, 1, "second", inAMinute())).toBe("saved");
    expect(await store.getGame(created.id)).toEqual({ version: 2, state: "second" });
    expect(await store.saveGame(randomUUID(), null, "lost", inAMinute())).toBe("session_not_found");
  });

  run("accepts one input per player for the current game version only", async () => {
    const store = makeStore?.() as SessionStore;
    const created = session();
    await store.create(created, inAMinute());
    await store.saveGame(created.id, null, "phase-1", inAMinute());

    expect(await store.submitInput(created.id, 1, "priya", "a", inAMinute())).toBe("accepted");
    expect(await store.submitInput(created.id, 1, "priya", "b", inAMinute())).toBe("duplicate");
    expect(await store.submitInput(created.id, 2, "daan", "c", inAMinute())).toBe("closed");
    expect(await store.listInputs(created.id)).toEqual(new Map([["priya", "a"]]));

    await store.saveGame(created.id, 1, "phase-2", inAMinute());
    expect(await store.listInputs(created.id)).toEqual(new Map());
    expect(await store.submitInput(created.id, 1, "daan", "late", inAMinute())).toBe("closed");
    expect(await store.submitInput(randomUUID(), 1, "daan", "d", inAMinute())).toBe("closed");
  });

  if (name === "redis" && redis) {
    it("puts an expiry on every key it writes", async () => {
      const prefix = `${redisPrefix}${randomUUID()}:`;
      const store = createRedisSessionStore(redis, prefix);
      const created = session();

      await store.create(created, inAMinute());

      const keys = await redis.keys(`${prefix}*`);
      const ttls = await Promise.all(keys.map((key) => redis.pTTL(key)));
      expect(keys).toHaveLength(2);
      expect(ttls.every((ttl) => ttl > 0 && ttl <= 60_000 + CLOCK_DRIFT_MS)).toBe(true);
    });

    it("refreshes the expiry of every session key on touch", async () => {
      const prefix = `${redisPrefix}${randomUUID()}:`;
      const store = createRedisSessionStore(redis, prefix);
      const created = session();
      await store.create(created, inAMinute());
      await store.addPlayer(created.id, player("Priya"), joinOptions("priya"));

      const priyaId = (await store.listPlayers(created.id))[0]?.id ?? "";
      await store.setAvatar(
        created.id,
        priyaId,
        { bytes: Buffer.from([1]), type: "image/webp", version: 1 },
        inAMinute(),
      );
      await store.saveSetup(created.id, "{}", "summary", inAMinute());
      await store.saveGame(created.id, null, "{}", inAMinute());
      await store.addImage(created.id, "image", imageLimits(5));
      await store.submitInput(created.id, 1, priyaId, "{}", inAMinute());
      await store.touch(created, Date.now() + 10 * 60_000);

      const keys = await redis.keys(`${prefix}*`);
      const ttls = await Promise.all(keys.map((key) => redis.pTTL(key)));
      expect(keys).toHaveLength(11);
      expect(ttls.every((ttl) => ttl > 60_000 && ttl <= 10 * 60_000 + CLOCK_DRIFT_MS)).toBe(true);
    });

    it("leaves no key without an expiry, even when a session expires mid-update", async () => {
      const prefix = `${redisPrefix}${randomUUID()}:`;
      const store = createRedisSessionStore(redis, prefix);
      const created = session();
      await store.create(created, Date.now() + 50);
      await new Promise((resolve) => setTimeout(resolve, 80));

      await store.setStatus(created.id, "playing");
      await store.touch(created, inAMinute());

      expect(await redis.keys(`${prefix}*`)).toEqual([]);
    });
  }
});

describe("memory session store expiry", () => {
  it("forgets sessions once they expire", async () => {
    let now = 1_000;
    const store = createMemorySessionStore(() => now);
    await store.create(session({ createdAt: now }), now + 500);

    now += 501;

    expect(await store.findByRoomCode("KWPX")).toBeNull();
  });
});
