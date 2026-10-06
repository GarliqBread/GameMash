import { DRAW_IT_UPLOAD_MAX_BYTES, type SessionSetup } from "@gamemash/games/config";
import { drawItRules } from "@gamemash/games/server";
import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import { createMemorySessionStore } from "../sessions/memory-store.js";
import { createSessionService } from "../sessions/service.js";
import { healthyRedis } from "../test-app.js";
import { createGameRunner } from "./runner.js";

const drawItSetup: SessionSetup = {
  name: "Friday team mash",
  games: [{ id: "draw-1", type: "draw-it", config: { words: [{ id: "w1", text: "Lighthouse" }], drawSeconds: 30 } }],
};

const line = { color: "blue", size: "thin", points: [[0.2, 0.4, 0.5]] };

const setup = async () => {
  const store = createMemorySessionStore();
  const sessions = createSessionService({ store });
  const runner = createGameRunner({
    store,
    readSetup: sessions.readSetup,
    rules: [drawItRules],
    log: { error: vi.fn() },
  });
  const created = await sessions.create();
  const { sessionId, hostToken } = created;
  const session = await store.findById(sessionId);
  if (!session) throw new Error("session was not created");
  await sessions.saveSetup(session, drawItSetup);
  const join = async (name: string) => {
    const joined = await sessions.join(sessionId, name);
    if (!joined.ok) throw new Error(joined.error);
    return joined.value;
  };
  const priya = await join("Priya");
  const daan = await join("Daan");
  await sessions.start(sessionId);
  await runner.begin(sessionId);

  const connected = new Set([priya.playerId, daan.playerId]);
  const app = buildApp({
    redis: healthyRedis,
    sessions,
    rateLimit: false,
    uploads: {
      upload: runner.upload,
      readUpload: runner.readUpload,
      connectedPlayers: () => connected,
    },
  });
  const auth = (token: string | null) => (token ? { authorization: `Bearer ${token}` } : {});
  const player = priya;
  const upload = (payload: unknown, token: string | null = player.playerToken, playerId = player.playerId) =>
    app.inject({
      method: "PUT",
      url: `/api/sessions/${sessionId}/players/${playerId}/game/upload`,
      payload: payload as object,
      headers: auth(token),
    });
  const readAsPlayer = (uploadId: string, token: string | null = player.playerToken) =>
    app.inject({
      method: "GET",
      url: `/api/sessions/${sessionId}/players/${player.playerId}/game/uploads/${uploadId}`,
      headers: auth(token),
    });
  const readAsHost = (uploadId: string, token: string | null = hostToken) =>
    app.inject({ method: "GET", url: `/api/sessions/${sessionId}/game/uploads/${uploadId}`, headers: auth(token) });
  return { upload, readAsPlayer, readAsHost, priya, daan, hostToken };
};

const body = (strokes: unknown[], phaseId = 1, done = false) => ({ phaseId, upload: { done, drawing: { strokes } } });

describe("game upload routes", () => {
  it("saves a player's drawing and gives it back only to them while drawing", async () => {
    const { upload, readAsPlayer, readAsHost } = await setup();

    expect((await upload(body([line]))).statusCode).toBe(204);
    expect((await upload(body([line, line]))).statusCode).toBe(204);

    const mine = await readAsPlayer("mine");
    expect(mine.statusCode).toBe(200);
    expect(mine.headers["cache-control"]).toBe("no-store");
    expect(mine.json()).toEqual({ strokes: [line, line] });
    expect((await readAsHost("mine")).statusCode).toBe(404);
    expect((await readAsHost("d1")).statusCode).toBe(404);
  });

  it("answers with no content while the player has not drawn yet", async () => {
    const { readAsPlayer } = await setup();

    const response = await readAsPlayer("mine");

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");
  });

  it("returns not_found for drawings the viewer may not see", async () => {
    const { readAsPlayer, readAsHost } = await setup();

    for (const response of [await readAsPlayer("d1"), await readAsHost("mine")]) {
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ code: "not_found" });
    }
  });

  it("refuses requests without the right token", async () => {
    const { upload, readAsPlayer, readAsHost, daan, hostToken } = await setup();

    expect((await upload(body([line]), null)).statusCode).toBe(401);
    expect((await upload(body([line]), daan.playerToken)).statusCode).toBe(401);
    expect((await upload(body([line]), hostToken)).statusCode).toBe(401);
    expect((await readAsPlayer("mine", daan.playerToken)).statusCode).toBe(401);
    expect((await readAsHost("d1", daan.playerToken)).statusCode).toBe(401);
  });

  it.each([
    ["an unknown field", { ...body([line]), name: "Priya" }],
    ["a missing phase", { upload: body([line]).upload }],
    ["a drawing the game rejects", body([{ ...line, color: "teal" }])],
  ])("rejects %s", async (_, payload) => {
    const { upload } = await setup();

    expect((await upload(payload)).json()).toEqual({ code: "bad_request" });
  });

  it("rejects drawings that are too large", async () => {
    const { upload } = await setup();
    const points = Array.from({ length: DRAW_IT_UPLOAD_MAX_BYTES / 10 }, () => [0.123_456, 0.654_321, 0.5]);

    const response = await upload(body([{ ...line, points }]));

    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual({ code: "payload_too_large" });
  });

  it("refuses drawings for a phase that is not open", async () => {
    const { upload } = await setup();

    const response = await upload(body([line], 2));

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ code: "input_closed" });
  });

  it("ends drawing once every connected player is done", async () => {
    const { upload, readAsHost, daan } = await setup();

    expect((await upload(body([line], 1, true))).statusCode).toBe(204);
    expect((await upload(body([line], 1, true), daan.playerToken, daan.playerId)).statusCode).toBe(204);

    expect((await upload(body([line], 1, true))).statusCode).toBe(409);
    expect((await readAsHost("d1")).json()).toEqual({ strokes: [line] });
  });
});
