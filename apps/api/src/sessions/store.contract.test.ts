import { randomUUID } from "node:crypto";
import { randomCharacter } from "@gamemash/shared";
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

  const player = (name: string, joinedAt = Date.now()) => ({
    id: randomUUID(),
    name,
    tokenHash: "hash",
    joinedAt,
    character: randomCharacter(),
  });
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

  const withPhoto = async (store: SessionStore) => {
    const created = session();
    await store.create(created, inAMinute());
    const priya = player("Priya");
    await store.addPlayer(created.id, priya, joinOptions("priya"));
    await store.setAvatar(
      created.id,
      priya.id,
      { bytes: Buffer.from([1]), type: "image/webp", version: 3 },
      inAMinute(),
    );
    return { created, priya };
  };

  run("saves a new character and drops the photo", async () => {
    const store = makeStore?.() as SessionStore;
    const { created, priya } = await withPhoto(store);
    const changed = { ...priya, character: { ...priya.character, top: 0, beard: null } };

    expect(await store.setCharacter(created.id, changed, inAMinute())).toBe("saved");

    expect(await store.findPlayer(created.id, priya.id)).toEqual(changed);
    expect(await store.getAvatar(created.id, priya.id)).toBeNull();
    expect(await store.avatarVersions(created.id)).toEqual(new Map());
  });

  run("removes a player with their photo and frees their name", async () => {
    const store = makeStore?.() as SessionStore;
    const { created, priya } = await withPhoto(store);

    expect(await store.removePlayer(created.id, priya.id, "priya", inAMinute())).toBe("removed");

    expect(await store.findPlayer(created.id, priya.id)).toBeNull();
    expect(await store.listPlayers(created.id)).toEqual([]);
    expect(await store.getAvatar(created.id, priya.id)).toBeNull();
    expect(await store.addPlayer(created.id, player("Priya"), joinOptions("priya"))).toBe("added");
  });

  run("keeps a name that belongs to another player when removing", async () => {
    const store = makeStore?.() as SessionStore;
    const created = session();
    await store.create(created, inAMinute());
    const priya = player("Priya");
    const daan = player("Daan");
    await store.addPlayer(created.id, priya, joinOptions("priya"));
    await store.addPlayer(created.id, daan, joinOptions("daan"));

    expect(await store.removePlayer(created.id, priya.id, "daan", inAMinute())).toBe("removed");

    expect(await store.addPlayer(created.id, player("Daan"), joinOptions("daan"))).toBe("name_taken");
    expect(await store.listPlayers(created.id)).toEqual([daan]);
  });

  run("only removes players in the lobby", async () => {
    const store = makeStore?.() as SessionStore;
    const { created, priya } = await withPhoto(store);
    await store.setStatus(created.id, "playing");

    expect(await store.removePlayer(created.id, priya.id, "priya", inAMinute())).toBe("locked");
    expect(await store.findPlayer(created.id, priya.id)).toEqual(priya);
    expect(await store.removePlayer(created.id, randomUUID(), "x", inAMinute())).toBe("locked");
    expect(await store.removePlayer(randomUUID(), priya.id, "priya", inAMinute())).toBe("session_not_found");
  });

  run("reports unknown players when removing", async () => {
    const store = makeStore?.() as SessionStore;
    const created = session();
    await store.create(created, inAMinute());

    expect(await store.removePlayer(created.id, randomUUID(), "priya", inAMinute())).toBe("player_not_found");
  });

  run("removes a photo", async () => {
    const store = makeStore?.() as SessionStore;
    const { created, priya } = await withPhoto(store);

    expect(await store.removeAvatar(created.id, priya.id, inAMinute())).toBe("saved");

    expect(await store.getAvatar(created.id, priya.id)).toBeNull();
    expect(await store.findPlayer(created.id, priya.id)).toEqual(priya);
  });

  run("locks avatars once the session has left the lobby", async () => {
    const store = makeStore?.() as SessionStore;
    const { created, priya } = await withPhoto(store);
    await store.setStatus(created.id, "playing");
    const photo = { bytes: Buffer.from([2]), type: "image/webp" as const, version: 4 };

    expect(await store.setAvatar(created.id, priya.id, photo, inAMinute())).toBe("locked");
    expect(
      await store.setCharacter(created.id, { ...priya, character: { ...priya.character, top: 1 } }, inAMinute()),
    ).toBe("locked");
    expect(await store.removeAvatar(created.id, priya.id, inAMinute())).toBe("locked");
    expect(await store.findPlayer(created.id, priya.id)).toEqual(priya);
    expect(await store.avatarVersions(created.id)).toEqual(new Map([[priya.id, 3]]));
  });

  run("refuses character and photo changes for unknown players or sessions", async () => {
    const store = makeStore?.() as SessionStore;
    const created = session();
    await store.create(created, inAMinute());
    const stranger = player("Stranger");

    expect(await store.setCharacter(created.id, stranger, inAMinute())).toBe("player_not_found");
    expect(await store.removeAvatar(created.id, stranger.id, inAMinute())).toBe("player_not_found");
    expect(await store.setCharacter(randomUUID(), stranger, inAMinute())).toBe("session_not_found");
    expect(await store.removeAvatar(randomUUID(), stranger.id, inAMinute())).toBe("session_not_found");
    expect(await store.listPlayers(created.id)).toEqual([]);
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
    expect(await store.saveGame(created.id, null, "first", inAMinute(), false)).toBe("saved");
    expect(await store.saveGame(created.id, null, "again", inAMinute(), false)).toBe("conflict");
    expect(await store.saveGame(created.id, 2, "ahead", inAMinute(), false)).toBe("conflict");
    expect(await store.saveGame(created.id, 1, "second", inAMinute(), false)).toBe("saved");
    expect(await store.getGame(created.id)).toEqual({ version: 2, state: "second" });
    expect(await store.saveGame(randomUUID(), null, "lost", inAMinute(), false)).toBe("session_not_found");
  });

  run("accepts one input per player for the current game version only", async () => {
    const store = makeStore?.() as SessionStore;
    const created = session();
    await store.create(created, inAMinute());
    await store.saveGame(created.id, null, "phase-1", inAMinute(), false);

    expect(await store.submitInput(created.id, 1, "priya", "a", inAMinute(), false)).toBe("accepted");
    expect(await store.submitInput(created.id, 1, "priya", "b", inAMinute(), false)).toBe("duplicate");
    expect(await store.submitInput(created.id, 2, "daan", "c", inAMinute(), false)).toBe("closed");
    expect(await store.listInputs(created.id)).toEqual(new Map([["priya", "a"]]));

    expect(await store.submitInput(created.id, 1, "daan", "c", inAMinute(), true)).toBe("accepted");
    expect(await store.submitInput(created.id, 1, "daan", "d", inAMinute(), true)).toBe("accepted");
    expect(await store.listInputs(created.id)).toEqual(
      new Map([
        ["priya", "a"],
        ["daan", "d"],
      ]),
    );

    await store.saveGame(created.id, 1, "phase-2", inAMinute(), false);
    expect(await store.listInputs(created.id)).toEqual(new Map());
    expect(await store.submitInput(created.id, 1, "daan", "late", inAMinute(), true)).toBe("closed");
    expect(await store.submitInput(randomUUID(), 1, "daan", "d", inAMinute(), false)).toBe("closed");
  });

  run("keeps uploads until a game save clears them", async () => {
    const store = makeStore?.() as SessionStore;
    const created = session();
    await store.create(created, inAMinute());
    await store.saveGame(created.id, null, "phase-1", inAMinute(), false);

    expect(await store.saveUpload(created.id, 1, "priya", "first", inAMinute())).toBe("saved");
    expect(await store.saveUpload(created.id, 1, "priya", "second", inAMinute())).toBe("saved");
    expect(await store.saveUpload(created.id, 2, "daan", "early", inAMinute())).toBe("closed");
    expect(await store.saveUpload(randomUUID(), 1, "daan", "lost", inAMinute())).toBe("closed");
    expect(await store.getUpload(created.id, "priya")).toBe("second");
    expect(await store.getUpload(created.id, "daan")).toBeNull();

    await store.saveGame(created.id, 1, "phase-2", inAMinute(), false);
    expect(await store.getUpload(created.id, "priya")).toBe("second");

    await store.saveGame(created.id, 2, "phase-3", inAMinute(), true);
    expect(await store.getUpload(created.id, "priya")).toBeNull();
  });

  run("resets a playing session to the lobby, keeping the game version and dropping inputs and uploads", async () => {
    const store = makeStore?.() as SessionStore;
    const created = session();
    await store.create(created, inAMinute());
    await store.saveGame(created.id, null, "finished", inAMinute(), false);
    await store.submitInput(created.id, 1, "priya", "input", inAMinute(), false);
    await store.saveUpload(created.id, 1, "priya", "drawing", inAMinute());

    expect(await store.resetGame(created.id, 1)).toBe(false);
    await store.setStatus(created.id, "playing");
    expect(await store.resetGame(created.id, 2)).toBe(false);
    expect(await store.resetGame(created.id, 1)).toBe(true);

    expect((await store.findById(created.id))?.status).toBe("lobby");
    expect(await store.getGame(created.id)).toEqual({ version: 1, state: "finished" });
    expect(await store.listInputs(created.id)).toEqual(new Map());
    expect(await store.getUpload(created.id, "priya")).toBeNull();
    expect(await store.resetGame(randomUUID(), 1)).toBe(false);
  });

  run("deletes a session and frees its room code", async () => {
    const store = makeStore?.() as SessionStore;
    const created = session();
    await store.create(created, inAMinute());
    await store.addPlayer(created.id, player("Priya"), joinOptions("priya"));
    await store.saveGame(created.id, null, "{}", inAMinute(), false);

    await store.deleteSession(created);

    expect(await store.findById(created.id)).toBeNull();
    expect(await store.findByRoomCode(created.roomCode)).toBeNull();
    expect(await store.listPlayers(created.id)).toEqual([]);
    expect(await store.getGame(created.id)).toBeNull();
    expect(await store.create(session(), inAMinute())).toBe("created");
  });

  run("keeps a room code that another session took over when deleting", async () => {
    const store = makeStore?.() as SessionStore;
    const expired = session();
    const current = session();
    await store.create(current, inAMinute());

    await store.deleteSession(expired);

    expect(await store.findByRoomCode(current.roomCode)).toEqual(current);
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
      await store.saveGame(created.id, null, "{}", inAMinute(), false);
      await store.addImage(created.id, "image", imageLimits(5));
      await store.submitInput(created.id, 1, priyaId, "{}", inAMinute(), false);
      await store.saveUpload(created.id, 1, priyaId, "{}", inAMinute());
      await store.touch(created, Date.now() + 10 * 60_000);

      const keys = await redis.keys(`${prefix}*`);
      const ttls = await Promise.all(keys.map((key) => redis.pTTL(key)));
      expect(keys).toHaveLength(12);
      expect(ttls.every((ttl) => ttl > 60_000 && ttl <= 10 * 60_000 + CLOCK_DRIFT_MS)).toBe(true);
    });

    it("removes every session key on delete", async () => {
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
      await store.saveGame(created.id, null, "{}", inAMinute(), false);
      await store.addImage(created.id, "image", imageLimits(5));
      await store.submitInput(created.id, 1, priyaId, "{}", inAMinute(), false);
      await store.saveUpload(created.id, 1, priyaId, "{}", inAMinute());

      await store.deleteSession(created);
      await store.releaseImages(created.id);

      expect(await redis.keys(`${prefix}*`)).toEqual([]);
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
