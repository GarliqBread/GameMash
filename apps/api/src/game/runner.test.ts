import { DRAW_IT_RESULTS_MS, POP_QUIZ_READ_MS, type SessionSetup } from "@gamemash/games/config";
import { drawItRules, popQuizRules } from "@gamemash/games/server";
import type { GameSnapshot } from "@gamemash/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemorySessionStore } from "../sessions/memory-store.js";
import { createSessionService } from "../sessions/service.js";
import type { SessionStore } from "../sessions/store.js";
import { readySetup } from "../sessions/test-setup.js";
import { createGameRunner } from "./runner.js";
import { ASK_MS, createTestRules, testRules } from "./test-rules.js";

const settle = () => new Promise((resolve) => setImmediate(resolve));

const setupWith = (questionCount: number): SessionSetup => {
  const setup = readySetup();
  const [game] = setup.games;
  if (!game) throw new Error("ready setup has no game");
  const [question] = game.config.questions;
  if (!question) throw new Error("ready setup has no question");
  const questions = Array.from({ length: questionCount }, (_, index) => ({ ...question, id: `q${index + 1}` }));
  return { ...setup, games: [{ ...game, config: { ...game.config, questions } }] };
};

const playing = (snapshot: GameSnapshot | undefined) => {
  if (snapshot?.status !== "playing") throw new Error(`expected a playing snapshot, got ${snapshot?.status}`);
  return snapshot;
};

const startGame = async ({
  questions = 2,
  names = ["Priya", "Daan"],
  rules = testRules,
  setup = setupWith(questions),
} = {}) => {
  const store = createMemorySessionStore();
  const sessions = createSessionService({ store });
  const created = await sessions.create();
  const sessionId = created.sessionId;
  const session = await store.findById(sessionId);
  if (!session) throw new Error("session was not created");
  await sessions.saveSetup(session, setup);
  const playerIds: string[] = [];
  for (const name of names) {
    const joined = await sessions.join(sessionId, name);
    if (!joined.ok) throw new Error(joined.error);
    playerIds.push(joined.value.playerId);
  }
  await sessions.start(sessionId);

  const makeRunner = (backingStore: SessionStore = store) =>
    createGameRunner({
      store: backingStore,
      readSetup: sessions.readSetup,
      rules: [rules],
      log: { error: vi.fn() },
    });
  const runner = makeRunner();
  const notified: string[] = [];
  runner.subscribe((id) => notified.push(id));
  await runner.begin(sessionId);

  const host = async () => (await runner.snapshots(sessionId, []))?.host;
  const player = async (playerId: string) => (await runner.snapshots(sessionId, [playerId]))?.players.get(playerId);
  const everyone = new Set(playerIds);

  return { store, sessions, sessionId, playerIds, runner, makeRunner, notified, host, player, everyone };
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("game runner", () => {
  it("enters the first phase with every player taking part", async () => {
    const { host, player, playerIds, notified, sessionId } = await startGame();
    const [priya = ""] = playerIds;

    const stage = playing(await host());
    expect(stage).toMatchObject({
      phaseId: 1,
      gameIndex: 0,
      gameCount: 1,
      gameType: "pop-quiz",
      phase: "ask",
      phaseEndsAt: Date.now() + ASK_MS,
      waitsForHost: false,
      view: { round: 0, answered: 0 },
    });
    expect(playing(await player(priya)).view).toMatchObject({ isParticipant: true, mine: null });
    expect(notified).toEqual([sessionId]);
  });

  it("does not begin twice or before the session has started", async () => {
    const { runner, sessionId, sessions, host } = await startGame();

    expect(await runner.begin(sessionId)).toBe(true);
    expect(playing(await host()).phaseId).toBe(1);

    const lobby = await sessions.create();
    expect(await runner.begin(lobby.sessionId)).toBe(false);
    expect(await runner.snapshots(lobby.sessionId, [])).toBeNull();
  });

  it("moves on when the phase timer runs out, then waits for the host", async () => {
    const { host } = await startGame();

    await vi.advanceTimersByTimeAsync(ASK_MS);
    await settle();

    expect(playing(await host())).toMatchObject({ phaseId: 2, phase: "reveal", phaseEndsAt: null, waitsForHost: true });
  });

  it("lets the host advance only the current host-paced phase", async () => {
    const { runner, sessionId, host } = await startGame();

    expect(await runner.next(sessionId, 1)).toBe(false);
    await vi.advanceTimersByTimeAsync(ASK_MS);
    await settle();

    expect(await runner.next(sessionId, 2)).toBe(true);
    expect(await runner.next(sessionId, 2)).toBe(false);
    expect(playing(await host())).toMatchObject({ phaseId: 3, phase: "ask", view: { round: 1 } });
  });

  it("accepts the first answer per player and refuses late or foreign ones", async () => {
    const { runner, sessionId, playerIds, sessions, player, everyone } = await startGame();
    const [priya = ""] = playerIds;

    expect(await runner.submit(sessionId, priya, 1, "right", everyone)).toBe("accepted");
    expect(await runner.submit(sessionId, priya, 1, "wrong", everyone)).toBe("duplicate");
    expect(await runner.submit(sessionId, priya, 2, "right", everyone)).toBe("closed");
    expect(playing(await player(priya)).view).toMatchObject({ mine: "right" });

    const late = await sessions.join(sessionId, "Late Lars");
    if (!late.ok) throw new Error(late.error);
    expect(await runner.submit(sessionId, late.value.playerId, 1, "right", everyone)).toBe("closed");
    expect(playing(await player(late.value.playerId)).view).toMatchObject({ isParticipant: false });
  });

  it("lets players change their input when the phase allows it", async () => {
    const { runner, sessionId, playerIds, player, everyone } = await startGame({
      rules: createTestRules({ replaceable: true, endsWhenAllSubmitted: false }),
    });
    const [priya = ""] = playerIds;

    expect(await runner.submit(sessionId, priya, 1, "right", everyone)).toBe("accepted");
    expect(await runner.submit(sessionId, priya, 1, "wrong", everyone)).toBe("accepted");
    expect(playing(await player(priya)).view).toMatchObject({ mine: "wrong" });
  });

  it("ends early only once every participant's input counts as done", async () => {
    const { runner, sessionId, playerIds, host, everyone } = await startGame({
      rules: createTestRules({ replaceable: true, isDone: (input) => input === "right" }),
    });
    const [priya = "", daan = ""] = playerIds;

    await runner.submit(sessionId, priya, 1, "right", everyone);
    await runner.submit(sessionId, daan, 1, "wrong", everyone);
    expect(playing(await host()).phase).toBe("ask");

    await runner.submit(sessionId, daan, 1, "right", everyone);
    expect(playing(await host()).phase).toBe("reveal");
  });

  it("only tells screens about a changed input when the player's done state changes", async () => {
    const { runner, sessionId, playerIds, notified, everyone } = await startGame({
      rules: createTestRules({ replaceable: true, isDone: (input) => input === "right" }),
    });
    const [priya = ""] = playerIds;
    const notifications = () => notified.length;
    const before = notifications();

    await runner.submit(sessionId, priya, 1, "wrong", everyone);
    expect(notifications()).toBe(before + 1);
    await runner.submit(sessionId, priya, 1, "wrong", everyone);
    expect(notifications()).toBe(before + 1);
    await runner.submit(sessionId, priya, 1, "right", everyone);
    expect(notifications()).toBe(before + 2);
  });

  it("lets the host skip a timed phase only when the game allows it", async () => {
    const { runner, sessionId, host } = await startGame({ rules: createTestRules({ revealMs: 8000 }) });

    await vi.advanceTimersByTimeAsync(ASK_MS);
    await settle();
    expect(playing(await host())).toMatchObject({ phase: "reveal", waitsForHost: false, canSkip: true });

    expect(await runner.next(sessionId, 2)).toBe(true);
    expect(playing(await host())).toMatchObject({ phaseId: 3, phase: "ask", canSkip: false });
  });

  it("refuses input the game does not understand, and input after the deadline", async () => {
    const { runner, sessionId, playerIds, everyone } = await startGame();
    const [priya = "", daan = ""] = playerIds;

    expect(await runner.submit(sessionId, priya, 1, { answer: "right" }, everyone)).toBe("closed");

    vi.setSystemTime(Date.now() + ASK_MS + 1);
    expect(await runner.submit(sessionId, daan, 1, "right", everyone)).toBe("closed");
  });

  it("ends the phase early once every connected participant has answered", async () => {
    const { runner, sessionId, playerIds, host } = await startGame();
    const [priya = "", daan = ""] = playerIds;
    const onlyPriyaConnected = new Set([priya]);

    await runner.submit(sessionId, priya, 1, "right", new Set([priya, daan]));
    await settle();
    expect(playing(await host()).phase).toBe("ask");

    await runner.submit(sessionId, daan, 1, "wrong", onlyPriyaConnected);
    await settle();
    expect(playing(await host()).phase).toBe("reveal");
  });

  it("only lets the players the game picks take part", async () => {
    const { runner, sessionId, playerIds, everyone, player, host } = await startGame({
      rules: createTestRules({ skipFirstPlayer: true }),
    });
    const [priya = "", daan = ""] = playerIds;

    expect(playing(await player(priya)).view).toMatchObject({ isParticipant: false });
    expect(await runner.submit(sessionId, priya, 1, "right", everyone)).toBe("closed");
    expect(await runner.submit(sessionId, daan, 1, "right", everyone)).toBe("accepted");
    await settle();

    expect(playing(await host()).phase).toBe("reveal");
  });

  it("lets the game refuse input based on its state and who sent it", async () => {
    const { runner, sessionId, playerIds, everyone } = await startGame();
    const [priya = "", daan = ""] = playerIds;

    expect(await runner.submit(sessionId, priya, 1, { vote: priya }, everyone)).toBe("closed");
    expect(await runner.submit(sessionId, priya, 1, { vote: "someone-else" }, everyone)).toBe("closed");
    expect(await runner.submit(sessionId, priya, 1, { vote: daan }, everyone)).toBe("accepted");
  });

  it("keeps the timer running when the phase does not end early", async () => {
    const { runner, sessionId, playerIds, everyone, host } = await startGame({
      rules: createTestRules({ endsWhenAllSubmitted: false }),
    });
    const [priya = "", daan = ""] = playerIds;

    await runner.submit(sessionId, priya, 1, "right", everyone);
    await runner.submit(sessionId, daan, 1, "right", everyone);
    await settle();
    expect(playing(await host()).phase).toBe("ask");

    await vi.advanceTimersByTimeAsync(ASK_MS);
    await settle();
    expect(playing(await host()).phase).toBe("reveal");
  });

  it("adds up points and finishes after the last game", async () => {
    const { runner, sessionId, playerIds, everyone, host } = await startGame({ questions: 1 });
    const [priya = "", daan = ""] = playerIds;

    await runner.submit(sessionId, priya, 1, "right", everyone);
    await runner.submit(sessionId, daan, 1, "wrong", everyone);
    await settle();
    await runner.next(sessionId, 2);

    expect(await host()).toEqual({
      status: "finished",
      phaseId: 3,
      serverNow: Date.now(),
      standings: [
        { playerId: priya, points: 100 },
        { playerId: daan, points: 0 },
      ],
    });
  });

  it("goes back to the lobby after the last game and plays again from zero on the next start", async () => {
    const { runner, sessions, store, sessionId, playerIds, everyone, host } = await startGame({ questions: 1 });
    const [priya = "", daan = ""] = playerIds;

    expect(await runner.reset(sessionId)).toBe(false);

    await runner.submit(sessionId, priya, 1, "right", everyone);
    await runner.submit(sessionId, daan, 1, "right", everyone);
    await settle();
    await runner.next(sessionId, 2);
    expect(await runner.begin(sessionId, false)).toBe(true);
    expect((await host())?.status).toBe("finished");

    expect(await runner.reset(sessionId)).toBe(true);
    expect((await store.findById(sessionId))?.status).toBe("lobby");
    expect(await runner.snapshots(sessionId, [])).toBeNull();
    expect(await runner.reset(sessionId)).toBe(false);

    const started = await sessions.start(sessionId);
    expect(started).toEqual({ ok: true, value: true });
    expect(await runner.begin(sessionId, true)).toBe(true);

    expect(playing(await host())).toMatchObject({ phaseId: 4, phase: "ask", view: { round: 0, answered: 0 } });
    expect(await runner.submit(sessionId, priya, 1, "right", everyone)).toBe("closed");
    await runner.submit(sessionId, priya, 4, "wrong", everyone);
    await runner.submit(sessionId, daan, 4, "wrong", everyone);
    await settle();
    await runner.next(sessionId, 5);
    const finished = await host();
    if (finished?.status !== "finished") throw new Error("expected the session to finish");
    expect(finished.standings.find((entry) => entry.playerId === priya)?.points).toBe(0);
  });

  it("never acknowledges an answer that the closing phase then drops", async () => {
    const { store, sessionId, playerIds, everyone, runner, makeRunner } = await startGame();
    const [priya = ""] = playerIds;
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let isGated = false;
    const gatedStore: SessionStore = {
      ...store,
      listInputs: async (id) => {
        const inputs = await store.listInputs(id);
        if (isGated) await gate;
        return inputs;
      },
    };
    runner.close();
    const gated = makeRunner(gatedStore);
    await gated.resume(sessionId);

    isGated = true;
    await vi.advanceTimersByTimeAsync(ASK_MS);
    const submitted = gated.submit(sessionId, priya, 1, "right", everyone);
    await settle();
    release();
    await settle();

    expect(await submitted).toBe("closed");
    expect(playing((await gated.snapshots(sessionId, [priya]))?.players.get(priya))).toMatchObject({
      phase: "reveal",
      view: { mine: null, total: 0 },
    });
  });

  it("ends the phase when the last player who has not answered disconnects", async () => {
    const { runner, sessionId, playerIds, everyone, host } = await startGame();
    const [priya = ""] = playerIds;
    await runner.submit(sessionId, priya, 1, "right", everyone);

    expect(await runner.settle(sessionId, everyone)).toBe(false);
    expect(await runner.settle(sessionId, new Set([priya]))).toBe(true);
    expect(playing(await host()).phase).toBe("reveal");
  });

  it("stops scheduling timers for a session it has forgotten", async () => {
    const { runner, sessionId, host } = await startGame();

    runner.forget(sessionId);
    await vi.advanceTimersByTimeAsync(ASK_MS);
    await settle();

    expect(playing(await host()).phase).toBe("ask");
  });

  it("picks up a running phase timer after a restart", async () => {
    const { store, sessionId, makeRunner, runner, host } = await startGame();
    runner.close();
    const restarted = makeRunner(store);

    await restarted.resume(sessionId);
    await vi.advanceTimersByTimeAsync(ASK_MS);
    await settle();

    expect(playing(await host()).phase).toBe("reveal");
  });

  it("begins a started session that has no game yet when a screen reconnects", async () => {
    const { store, sessions } = await startGame();
    const created = await sessions.create();
    const session = await store.findById(created.sessionId);
    if (!session) throw new Error("session was not created");
    await sessions.saveSetup(session, setupWith(1));
    await sessions.start(created.sessionId);
    const runner = createGameRunner({
      store,
      readSetup: sessions.readSetup,
      rules: [testRules],
      log: { error: vi.fn() },
    });

    await runner.resume(created.sessionId);

    expect(playing((await runner.snapshots(created.sessionId, []))?.host).phase).toBe("ask");
  });

  it("finishes straight away when no game in the lineup has rules", async () => {
    const { store, sessions } = await startGame();
    const created = await sessions.create();
    const session = await store.findById(created.sessionId);
    if (!session) throw new Error("session was not created");
    await sessions.saveSetup(session, setupWith(1));
    await sessions.start(created.sessionId);
    const runner = createGameRunner({ store, readSetup: sessions.readSetup, rules: [], log: { error: vi.fn() } });

    await runner.begin(created.sessionId);

    expect((await runner.snapshots(created.sessionId, []))?.host).toMatchObject({ status: "finished", standings: [] });
  });
});

describe("pop quiz on the game runner", () => {
  it("plays a question end to end without leaking the answer early", async () => {
    const { runner, sessionId, playerIds, everyone, host, player } = await startGame({
      questions: 1,
      rules: popQuizRules,
    });
    const [priya = "", daan = ""] = playerIds;
    const leaks = (snapshot: GameSnapshot | undefined) => JSON.stringify(snapshot).includes("correct");
    const showsAnswers = (snapshot: GameSnapshot | undefined) => JSON.stringify(snapshot).includes("Saturn");

    expect(playing(await host())).toMatchObject({ phase: "question", view: { kind: "question" } });
    expect(leaks(await host()) || showsAnswers(await host())).toBe(false);
    expect(leaks(await player(priya)) || showsAnswers(await player(priya))).toBe(false);

    await vi.advanceTimersByTimeAsync(POP_QUIZ_READ_MS);
    await settle();
    expect(playing(await player(priya))).toMatchObject({ phase: "answering", view: { mine: null } });
    expect(await runner.submit(sessionId, priya, 2, "triangle", everyone)).toBe("accepted");
    expect(leaks(await player(daan))).toBe(false);
    expect(leaks(await host())).toBe(false);
    expect(await runner.submit(sessionId, daan, 2, "dome", everyone)).toBe("accepted");
    await settle();

    expect(playing(await host())).toMatchObject({
      phase: "reveal",
      waitsForHost: true,
      view: { correct: "triangle", correctCount: 1, counts: { triangle: 1, dome: 1 } },
    });
    expect(playing(await player(priya)).view).toMatchObject({ result: { isCorrect: true, points: 1000 }, rank: 1 });

    await runner.next(sessionId, 3);
    expect(await host()).toMatchObject({
      status: "finished",
      standings: [
        { playerId: priya, points: 1000 },
        { playerId: daan, points: 0 },
      ],
    });
  });
});

describe("draw it on the game runner", () => {
  const drawItSetup: SessionSetup = {
    name: "Friday team mash",
    games: [{ id: "draw-1", type: "draw-it", config: { words: [{ id: "w1", text: "Lighthouse" }], drawSeconds: 30 } }],
  };

  it("forgets the previous round's drawings when the next round starts", async () => {
    const twoWords: SessionSetup = {
      ...drawItSetup,
      games: drawItSetup.games.map((game) =>
        game.type === "draw-it"
          ? { ...game, config: { ...game.config, words: [...game.config.words, { id: "w2", text: "Cat" }] } }
          : game,
      ),
    };
    const { runner, sessionId, playerIds, everyone, host } = await startGame({ rules: drawItRules, setup: twoWords });
    const [priya = ""] = playerIds;
    const mine = () => runner.readUpload(sessionId, { kind: "player", playerId: priya }, "mine");
    const line = { color: "red", size: "thin", points: [[0.5, 0.5, 0.5]] };

    await runner.upload(sessionId, priya, 1, { done: false, drawing: { strokes: [line] } }, everyone);
    expect(await mine()).not.toBeNull();

    await vi.advanceTimersByTimeAsync(30_000);
    await settle();
    expect(playing(await host()).phase).toBe("results");
    await runner.next(sessionId, 2);

    expect(playing(await host())).toMatchObject({ phase: "draw", view: { word: "Cat" } });
    expect(await mine()).toBeNull();
  });

  it("draws, rates and scores a round, letting players change their mind", async () => {
    const { runner, sessionId, playerIds, everyone, host, player } = await startGame({
      names: ["Priya", "Daan", "Lars"],
      rules: drawItRules,
      setup: drawItSetup,
    });
    const [priya = "", daan = "", lars = ""] = playerIds;

    const line = { color: "red", size: "thick", points: [[0.1, 0.1, 0.5]] };
    const drawing = (strokes: unknown[], done = true) => ({ done, drawing: { strokes } });

    expect(await runner.submit(sessionId, priya, 1, { done: true, blank: false }, everyone)).toBe("closed");
    expect(await runner.upload(sessionId, priya, 1, drawing([line, { ...line, color: "teal" }]), everyone)).toBe(
      "invalid",
    );
    expect(await runner.upload(sessionId, priya, 1, drawing([line], false), everyone)).toBe("accepted");
    expect(await runner.upload(sessionId, priya, 1, drawing([line, line]), everyone)).toBe("accepted");
    expect(await runner.upload(sessionId, daan, 1, drawing([line]), everyone)).toBe("accepted");
    expect(playing(await host())).toMatchObject({ phase: "draw", view: { doneIds: [priya, daan] } });
    expect(await runner.readUpload(sessionId, { kind: "player", playerId: priya }, "mine")).toBe(
      JSON.stringify({ strokes: [line, line] }),
    );
    expect(await runner.readUpload(sessionId, { kind: "host" }, "mine")).toBeNull();
    expect(await runner.upload(sessionId, lars, 1, drawing([]), everyone)).toBe("accepted");
    await settle();

    const rating = playing(await host());
    expect(rating).toMatchObject({ phase: "rate", phaseId: 2, view: { drawingIds: ["d1", "d2"] } });
    const toRate = async (playerId: string) => {
      const view = playing(await player(playerId)).view as { toRate: string[] };
      const [drawingId = ""] = view.toRate;
      return drawingId;
    };
    const priyaRates = await toRate(priya);
    expect(await runner.upload(sessionId, priya, 2, drawing([line]), everyone)).toBe("closed");
    expect(await runner.readUpload(sessionId, { kind: "player", playerId: priya }, priyaRates)).toBe(
      JSON.stringify({ strokes: [line] }),
    );
    expect(
      await runner.readUpload(sessionId, { kind: "player", playerId: priya }, priyaRates === "d1" ? "d2" : "d1"),
    ).toBeNull();
    expect(await runner.readUpload(sessionId, { kind: "host" }, "d1")).not.toBeNull();
    expect(await runner.submit(sessionId, priya, 2, { [priyaRates]: 3 }, everyone)).toBe("accepted");
    expect(await runner.submit(sessionId, priya, 2, { [priyaRates]: 9 }, everyone)).toBe("accepted");
    expect(await runner.submit(sessionId, daan, 2, { [await toRate(daan)]: 5 }, everyone)).toBe("accepted");
    expect(await runner.submit(sessionId, lars, 2, { [await toRate(lars)]: 7 }, everyone)).toBe("accepted");
    await settle();

    expect(playing(await host())).toMatchObject({ phase: "results", waitsForHost: false, canSkip: true });
    await vi.advanceTimersByTimeAsync(DRAW_IT_RESULTS_MS);
    await settle();

    const finished = await host();
    if (finished?.status !== "finished") throw new Error("expected the session to finish");
    expect(finished.standings.map((entry) => entry.playerId).toSorted()).toEqual([priya, daan].toSorted());
    expect(finished.standings.every((entry) => entry.points >= 500 && entry.points <= 900)).toBe(true);
  });
});
