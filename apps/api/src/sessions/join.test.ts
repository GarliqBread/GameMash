import { CharacterSchema } from "@gamemash/shared/schemas";
import { Value } from "typebox/value";
import { describe, expect, it, vi } from "vitest";
import { createLobbyNotifier } from "../lobby/notifier.js";
import { createMemorySessionStore } from "./memory-store.js";
import { hashSecret } from "./secrets.js";
import { createSessionService } from "./service.js";
import { readySetup } from "./test-setup.js";

const setup = (maxPlayers?: number) => {
  const store = createMemorySessionStore();
  const notifier = createLobbyNotifier();
  const service = createSessionService({ store, notifier, maxPlayers });
  return { store, notifier, service };
};

describe("joining a session", () => {
  it("adds a player, stores only a token hash and notifies the lobby", async () => {
    const { store, notifier, service } = setup();
    const listener = vi.fn();
    notifier.subscribe(listener);
    const { sessionId } = await service.create();

    const result = await service.join(sessionId, "  Priya  ");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const player = await store.findPlayer(sessionId, result.value.playerId);
    expect(player?.name).toBe("Priya");
    expect(player?.tokenHash).toBe(hashSecret(result.value.playerToken));
    expect(listener).toHaveBeenCalledWith(sessionId);
  });

  it("gives every new player a character that the lobby shows", async () => {
    const { service } = setup();
    const { sessionId } = await service.create();
    const result = await service.join(sessionId, "Priya");
    if (!result.ok) throw new Error("join failed");

    const state = await service.lobbyState(sessionId, new Set());

    const character = state?.players.find((player) => player.id === result.value.playerId)?.character;
    expect(Value.Check(CharacterSchema, character)).toBe(true);
  });

  it.each(["", "   ", "x".repeat(21), "Pri\u0000ya", "Pri​ya", "Priya\u200D", "Priya\u{E0041}"])(
    "rejects the name %j",
    async (name) => {
      const { service } = setup();
      const { sessionId } = await service.create();

      expect(await service.join(sessionId, name)).toEqual({ ok: false, error: "invalid_name" });
    },
  );

  it("accepts names of 20 characters including accents and emoji-free scripts", async () => {
    const { service } = setup();
    const { sessionId } = await service.create();

    expect((await service.join(sessionId, "Guðmundur Sigurðsson")).ok).toBe(true);
  });

  it("keeps names unique regardless of case", async () => {
    const { service } = setup();
    const { sessionId } = await service.create();
    await service.join(sessionId, "Priya");

    expect(await service.join(sessionId, "PRIYA")).toEqual({ ok: false, error: "name_taken" });
  });

  it("allows late joiners once the session has started", async () => {
    const { service } = setup();
    const { sessionId } = await service.create();
    await service.start(sessionId);

    expect((await service.join(sessionId, "Late Lars")).ok).toBe(true);
  });

  it("refuses players when the session is full", async () => {
    const { service } = setup(1);
    const { sessionId } = await service.create();
    await service.join(sessionId, "Priya");

    expect(await service.join(sessionId, "Daan")).toEqual({ ok: false, error: "session_full" });
  });

  it("refuses players for an ended session", async () => {
    const { store, service } = setup();
    const { sessionId } = await service.create();
    await store.setStatus(sessionId, "finished");

    expect(await service.join(sessionId, "Priya")).toEqual({ ok: false, error: "session_ended" });
  });

  it("returns room_not_found for an unknown session", async () => {
    const { service } = setup();

    expect(await service.join("00000000-0000-4000-8000-000000000000", "Priya")).toEqual({
      ok: false,
      error: "room_not_found",
    });
  });
});

describe("authentication", () => {
  it("accepts only the right host token", async () => {
    const { service } = setup();
    const { sessionId, hostToken } = await service.create();

    expect(await service.authenticateHost(sessionId, hostToken)).not.toBeNull();
    expect(await service.authenticateHost(sessionId, `${hostToken}x`)).toBeNull();
    expect(await service.authenticateHost(sessionId, "")).toBeNull();
  });

  it("accepts only the right player token for that player", async () => {
    const { service } = setup();
    const { sessionId } = await service.create();
    const priya = await service.join(sessionId, "Priya");
    const daan = await service.join(sessionId, "Daan");
    if (!priya.ok || !daan.ok) throw new Error("join failed");

    expect(await service.authenticatePlayer(sessionId, priya.value.playerId, priya.value.playerToken)).not.toBeNull();
    expect(await service.authenticatePlayer(sessionId, priya.value.playerId, daan.value.playerToken)).toBeNull();
  });
});

describe("starting a session", () => {
  it("announces the start once, even when asked twice", async () => {
    const { store, notifier, service } = setup();
    const { sessionId } = await service.create();
    const session = await store.findById(sessionId);
    if (!session) throw new Error("session was not created");
    await service.saveSetup(session, readySetup());
    const listener = vi.fn();
    notifier.subscribe(listener);

    expect(await service.start(sessionId)).toEqual({ ok: true, value: true });
    expect(await service.start(sessionId)).toEqual({ ok: true, value: false });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("refuses to start until every game is ready", async () => {
    const { store, service } = setup();
    const { sessionId } = await service.create();
    const session = await store.findById(sessionId);
    if (!session) throw new Error("session was not created");
    const incomplete = readySetup();
    const [game] = incomplete.games;
    const [question] = game?.config.questions ?? [];
    if (!game || !question) throw new Error("fixture is missing a question");

    expect(await service.start(sessionId)).toEqual({ ok: false, error: "setup_incomplete" });

    await service.saveSetup(session, {
      ...incomplete,
      games: [{ ...game, config: { ...game.config, questions: [{ ...question, correct: null }] } }],
    });
    expect(await service.start(sessionId)).toEqual({ ok: false, error: "setup_incomplete" });
    expect((await store.findById(sessionId))?.status).toBe("lobby");
  });

  it("only tells the lobby about setup changes it can see", async () => {
    const { store, notifier, service } = setup();
    const { sessionId } = await service.create();
    const session = await store.findById(sessionId);
    if (!session) throw new Error("session was not created");
    const listener = vi.fn();
    notifier.subscribe(listener);
    const setupWith = (text: string) => {
      const base = readySetup();
      const [game] = base.games;
      const [question] = game?.config.questions ?? [];
      if (!game || !question) throw new Error("fixture is missing a question");
      return {
        ...base,
        games: [{ ...game, config: { ...game.config, questions: [{ ...question, text: [{ text }] }] } }],
      };
    };

    await service.saveSetup(session, setupWith("First wording"));
    await service.saveSetup(session, setupWith("Second wording"));
    await service.saveSetup(session, { ...setupWith("Second wording"), name: "Renamed" });

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("returns room_not_found once the session has expired", async () => {
    let now = 0;
    const store = createMemorySessionStore(() => now);
    const service = createSessionService({ store, now: () => now });
    const { sessionId } = await service.create();

    now += 31 * 60 * 1000;

    expect(await service.start(sessionId)).toEqual({ ok: false, error: "room_not_found" });
    expect(await service.keepAlive(sessionId)).toBe(false);
  });
});
