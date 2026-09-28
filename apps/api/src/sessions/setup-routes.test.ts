import { defaultPopQuizConfig } from "@gamemash/games/config";
import type { CreateSessionResponse } from "@gamemash/shared";
import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import type { RedisHealth } from "../redis.js";
import { createMemorySessionStore } from "./memory-store.js";
import { createSessionService } from "./service.js";
import { readySetup } from "./test-setup.js";

const redis = { ping: async () => "PONG", isReady: true } as unknown as RedisHealth;

const quizSetup = readySetup;

const setup = async () => {
  const sessions = createSessionService({ store: createMemorySessionStore() });
  const app = buildApp({ redis, sessions, rateLimit: false });
  const session = (await app.inject({ method: "POST", url: "/api/sessions" })).json<CreateSessionResponse>();
  const url = `/api/sessions/${session.sessionId}/setup`;
  const auth = (token: string | null = session.hostToken) => (token ? { authorization: `Bearer ${token}` } : {});
  const save = (payload: unknown, token?: string | null) =>
    app.inject({ method: "PUT", url, payload: payload as object, headers: auth(token) });
  const load = (token?: string | null) => app.inject({ method: "GET", url, headers: auth(token) });
  return { app, sessions, session, save, load };
};

describe("session setup", () => {
  it("starts empty", async () => {
    const { load } = await setup();

    const response = await load();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ name: "", games: [] });
  });

  it("saves the setup and loads it back", async () => {
    const { save, load } = await setup();

    const saved = await save(quizSetup());

    expect(saved.statusCode).toBe(204);
    expect((await load()).json()).toEqual(quizSetup());
  });

  it("only lets the host read or change the setup", async () => {
    const { save, load } = await setup();

    expect((await load(null)).statusCode).toBe(401);
    expect((await load("wrong")).json()).toEqual({ code: "unauthorized" });
    expect((await save(quizSetup(), "wrong")).statusCode).toBe(401);
    expect((await save(quizSetup(), null)).statusCode).toBe(401);
  });

  it.each([
    ["an unknown game type", { name: "", games: [{ ...quizSetup().games[0], type: "draw-it" }] }],
    [
      "a time limit that is not offered",
      {
        ...quizSetup(),
        games: [{ ...quizSetup().games[0], config: { ...defaultPopQuizConfig("q1"), timeLimitSeconds: 45 } }],
      },
    ],
    ["a name that is too long", { ...quizSetup(), name: "x".repeat(41) }],
    ["a missing field", { name: "Friday" }],
  ])("rejects %s", async (_, payload) => {
    const { save } = await setup();

    const response = await save(payload);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ code: "bad_request" });
  });

  it("rejects unknown fields instead of dropping them", async () => {
    const { save, load } = await setup();
    const [game] = quizSetup().games;

    const response = await save({ ...quizSetup(), games: [{ ...game, extra: true }] });

    expect(response.statusCode).toBe(400);
    expect((await load()).json()).toEqual({ name: "", games: [] });
  });

  it("checks the host before reading the body", async () => {
    const { save } = await setup();

    const response = await save({ not: "a setup" }, null);

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ code: "unauthorized" });
  });

  it("rejects hidden control characters in the session name", async () => {
    const { save } = await setup();

    const response = await save({ ...quizSetup(), name: "Friday\u202Emash" });

    expect(response.json()).toEqual({ code: "bad_request" });
  });

  it("accepts the largest setup the schema allows, even in non-Latin scripts", async () => {
    const { save } = await setup();
    const question = (index: number) => ({
      id: `q${index}`,
      text: "問".repeat(90),
      answers: {
        triangle: "答".repeat(40),
        diamond: "答".repeat(40),
        circle: "答".repeat(40),
        square: "答".repeat(40),
      },
      correct: "triangle" as const,
    });
    const games = Array.from({ length: 10 }, (_, gameIndex) => ({
      id: `quiz-${gameIndex}`,
      type: "pop-quiz" as const,
      config: { ...defaultPopQuizConfig("q0"), questions: Array.from({ length: 50 }, (_, index) => question(index)) },
    }));

    const response = await save({ name: "名".repeat(40), games });

    expect(response.statusCode).toBe(204);
  });

  it("rejects duplicate question ids", async () => {
    const { save } = await setup();
    const base = quizSetup();
    const game = base.games[0];
    const question = game?.config.questions[0];
    if (!game || !question) throw new Error("fixture is missing a question");

    const response = await save({
      ...base,
      games: [{ ...game, config: { ...game.config, questions: [question, question] } }],
    });

    expect(response.json()).toEqual({ code: "bad_request" });
  });

  it("locks the setup once the session has started", async () => {
    const { sessions, session, save, load } = await setup();
    await save(quizSetup());
    await sessions.start(session.sessionId);

    const response = await save({ ...quizSetup(), name: "Changed" });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ code: "setup_locked" });
    expect((await load()).json().name).toBe("Friday team mash");
  });

  it("shares the name and a lineup summary with the lobby, but never the answers", async () => {
    const { sessions, session, save } = await setup();
    await save(quizSetup());

    const state = await sessions.lobbyState(session.sessionId, new Set());

    expect(state?.sessionName).toBe("Friday team mash");
    expect(state?.lineup).toEqual([{ id: "quiz-1", type: "pop-quiz", roundCount: 1, roundSeconds: 30 }]);
    expect(JSON.stringify(state)).not.toContain("Saturn");
  });
});
