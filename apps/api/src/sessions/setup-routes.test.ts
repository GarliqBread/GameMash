import { readFileSync } from "node:fs";
import { defaultPopQuizConfig } from "@gamemash/games/config";
import type { CreateSessionResponse, ImageListResponse, UploadImageResponse } from "@gamemash/shared";
import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { createMemoryImageStore } from "../media/memory-image-store.js";
import { healthyRedis } from "../test-app.js";
import { createMemorySessionStore } from "./memory-store.js";
import { createSessionService } from "./service.js";
import { readySetup } from "./test-setup.js";

const quizSetup = readySetup;
const photo = readFileSync(new URL("./fixtures/photo-256.jpg", import.meta.url));

const withImages = (images: string[]) => {
  const base = quizSetup();
  const [game] = base.games;
  const [question] = game?.config.questions ?? [];
  if (!game || !question) throw new Error("fixture is missing a question");
  return { ...base, games: [{ ...game, config: { ...game.config, questions: [{ ...question, images }] } }] };
};

type SetupOptions = {
  now?: () => number;
  withImageStore?: boolean;
};

const setup = async ({ now = Date.now, withImageStore = true }: SetupOptions = {}) => {
  const images = createMemoryImageStore();
  const store = createMemorySessionStore(now);
  const sessions = createSessionService({ store, now, images: withImageStore ? images : undefined });
  const app = buildApp({ redis: healthyRedis, sessions, rateLimit: false });
  const session = (await app.inject({ method: "POST", url: "/api/sessions" })).json<CreateSessionResponse>();
  const url = `/api/sessions/${session.sessionId}/setup`;
  const auth = (token: string | null = session.hostToken) => (token ? { authorization: `Bearer ${token}` } : {});
  const save = (payload: unknown, token?: string | null) =>
    app.inject({ method: "PUT", url, payload: payload as object, headers: auth(token) });
  const load = (token?: string | null) => app.inject({ method: "GET", url, headers: auth(token) });
  const uploadImage = async () =>
    (
      await app.inject({
        method: "PUT",
        url: `/api/sessions/${session.sessionId}/images`,
        payload: photo,
        headers: { "content-type": "image/jpeg", ...auth() },
      })
    ).json<UploadImageResponse>().imageId;
  return { app, sessions, session, images, save, load, uploadImage };
};

describe("session setup", () => {
  it("starts empty", async () => {
    const { load } = await setup();

    const response = await load();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ setup: { name: "", games: [] }, imagesEnabled: true });
  });

  it("saves the setup and loads it back", async () => {
    const { save, load } = await setup();

    const saved = await save(quizSetup());

    expect(saved.statusCode).toBe(204);
    expect((await load()).json().setup).toEqual(quizSetup());
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
    expect((await load()).json().setup).toEqual({ name: "", games: [] });
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

  it("rejects answers hidden by a true or false question", async () => {
    const { save } = await setup();
    const base = quizSetup();
    const [game] = base.games;
    const [question] = game?.config.questions ?? [];
    if (!game || !question) throw new Error("expected a quiz question");
    const withQuestion = (changes: Partial<typeof question>) => ({
      ...base,
      games: [{ ...game, config: { ...game.config, questions: [{ ...question, ...changes }] } }],
    });
    const trueFalse = {
      kind: "trueFalse" as const,
      answers: { squircle: "False", triangle: "", plus: "True", dome: "" },
      correct: "squircle" as const,
    };

    expect((await save(withQuestion(trueFalse))).statusCode).toBe(204);
    expect(
      (await save(withQuestion({ ...trueFalse, answers: { ...trueFalse.answers, dome: "Maybe" } }))).json(),
    ).toEqual({ code: "bad_request" });
    expect((await save(withQuestion({ ...trueFalse, correct: "triangle" }))).json()).toEqual({ code: "bad_request" });
  });

  it("accepts the largest setup the schema allows, even in non-Latin scripts", async () => {
    const { save, uploadImage } = await setup();
    const images = await Promise.all(Array.from({ length: 9 }, uploadImage));
    const question = (index: number) => ({
      id: `q${index}`,
      kind: "choice" as const,
      text: Array.from({ length: 40 }, () => ({ text: "問".repeat(2), bold: true, italic: true, underline: true })),
      images,
      timeLimitSeconds: 120,
      points: "double" as const,
      answers: {
        squircle: "答".repeat(40),
        triangle: "答".repeat(40),
        plus: "答".repeat(40),
        dome: "答".repeat(40),
      },
      correct: "squircle" as const,
    });
    const games = Array.from({ length: 10 }, (_, gameIndex) => ({
      id: `quiz-${gameIndex}`,
      type: "pop-quiz" as const,
      config: { ...defaultPopQuizConfig("q0"), questions: Array.from({ length: 50 }, (_, index) => question(index)) },
    }));

    const response = await save({ name: "名".repeat(40), games });

    expect(response.statusCode).toBe(204);
  });

  it("accepts images uploaded to the session and rejects any others", async () => {
    const { save, uploadImage } = await setup();
    const other = await setup();
    const own = await uploadImage();
    const foreign = await other.uploadImage();

    expect((await save(withImages([own]))).statusCode).toBe(204);
    expect((await save(withImages([own, foreign]))).json()).toEqual({ code: "bad_request" });
    expect((await save(withImages(["madeUpImageId"]))).json()).toEqual({ code: "bad_request" });
  });

  it("deletes images no question uses once they are ten minutes old", async () => {
    let now = Date.now();
    const { app, session, images, save, uploadImage } = await setup({ now: () => now });
    const used = await uploadImage();
    const dropped = await uploadImage();
    now += 10 * 60_000;
    const recent = await uploadImage();

    expect((await save(withImages([used]))).statusCode).toBe(204);

    const listed = await app.inject({
      method: "GET",
      url: `/api/sessions/${session.sessionId}/images`,
      headers: { authorization: `Bearer ${session.hostToken}` },
    });
    const kept = listed.json<ImageListResponse>().images.map((image) => image.id);
    expect(kept.toSorted()).toEqual([used, recent].toSorted());
    expect(kept).not.toContain(dropped);
    expect(images.keys()).toHaveLength(2);
  });

  it("drops image references while images are turned off", async () => {
    const { save, load } = await setup({ withImageStore: false });

    expect((await save(withImages(["storedBeforeRestart"]))).statusCode).toBe(204);

    const loaded = (await load()).json();
    expect(loaded.imagesEnabled).toBe(false);
    expect(loaded.setup.games[0].config.questions[0].images).toEqual([]);
  });

  it("rejects question text over the visible length limit", async () => {
    const { save } = await setup();
    const base = quizSetup();
    const [game] = base.games;
    const [question] = game?.config.questions ?? [];
    if (!game || !question) throw new Error("fixture is missing a question");
    const text = [{ text: "x".repeat(100), bold: true }, { text: "y".repeat(101) }];

    const response = await save({
      ...base,
      games: [{ ...game, config: { ...game.config, questions: [{ ...question, text }] } }],
    });

    expect(response.json()).toEqual({ code: "bad_request" });
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
    expect((await load()).json().setup.name).toBe("Friday team mash");
  });

  it("shares the name and a lineup summary with the lobby, but never the answers", async () => {
    const { sessions, session, save } = await setup();
    await save(quizSetup());

    const state = await sessions.lobbyState(session.sessionId, new Set());

    expect(state?.sessionName).toBe("Friday team mash");
    expect(state?.lineup).toEqual([
      { id: "quiz-1", type: "pop-quiz", roundCount: 1, roundSeconds: { min: 30, max: 30 } },
    ]);
    expect(JSON.stringify(state)).not.toContain("Saturn");
  });
});
