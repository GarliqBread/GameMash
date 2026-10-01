import { SESSION_NAME_MAX_LENGTH } from "@gamemash/games/config";
import type { CreateSessionResponse } from "@gamemash/shared";
import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { healthyRedis } from "../test-app.js";
import { createMemorySessionStore } from "./memory-store.js";
import { createSessionService } from "./service.js";

const setup = () =>
  buildApp({ redis: healthyRedis, sessions: createSessionService({ store: createMemorySessionStore() }) });

const createSession = async (app: ReturnType<typeof setup>) =>
  (await app.inject({ method: "POST", url: "/api/sessions" })).json<CreateSessionResponse>();

describe("POST /api/sessions", () => {
  it("creates a session with a room code and a host token", async () => {
    const app = setup();

    const response = await app.inject({ method: "POST", url: "/api/sessions" });
    const body = response.json<CreateSessionResponse>();

    expect(response.statusCode).toBe(201);
    expect(body.roomCode).toMatch(/^[A-HJ-NP-Z]{4}$/);
    expect(body.sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.hostToken).toBeTruthy();
  });

  it("starts the setup with the session name it was given", async () => {
    const app = setup();

    const created = (
      await app.inject({ method: "POST", url: "/api/sessions", payload: { name: "  Friday team mash " } })
    ).json<CreateSessionResponse>();
    const loaded = await app.inject({
      method: "GET",
      url: `/api/sessions/${created.sessionId}/setup`,
      headers: { authorization: `Bearer ${created.hostToken}` },
    });

    expect(loaded.json().setup).toEqual({ name: "Friday team mash", games: [] });
  });

  it("leaves the setup empty when the name is blank", async () => {
    const app = setup();

    const created = (
      await app.inject({ method: "POST", url: "/api/sessions", payload: { name: "   " } })
    ).json<CreateSessionResponse>();
    const loaded = await app.inject({
      method: "GET",
      url: `/api/sessions/${created.sessionId}/setup`,
      headers: { authorization: `Bearer ${created.hostToken}` },
    });

    expect(loaded.json().setup).toEqual({ name: "", games: [] });
  });

  it.each([
    ["a name that is too long", { name: "x".repeat(SESSION_NAME_MAX_LENGTH + 1) }],
    ["hidden characters", { name: "Friday\u200Bmash" }],
    ["unknown fields", { name: "Friday", extra: true }],
  ])("rejects %s", async (_label, payload) => {
    const app = setup();

    const response = await app.inject({ method: "POST", url: "/api/sessions", payload });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ code: "bad_request" });
  });
});

describe("GET /api/sessions/by-code/:code", () => {
  it("finds a session by its room code, ignoring case", async () => {
    const app = setup();
    const created = await createSession(app);

    const response = await app.inject({
      method: "GET",
      url: `/api/sessions/by-code/${created.roomCode.toLowerCase()}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ sessionId: created.sessionId, status: "lobby" });
  });

  it("never leaks the host token", async () => {
    const app = setup();
    const created = await createSession(app);

    const response = await app.inject({ method: "GET", url: `/api/sessions/by-code/${created.roomCode}` });

    expect(response.body).not.toContain(created.hostToken);
    expect(response.body).not.toContain("hostTokenHash");
  });

  it.each(["ZZZZ", "KWPO", "KW1X", "KWP"])("returns room_not_found for %s", async (code) => {
    const app = setup();

    const response = await app.inject({ method: "GET", url: `/api/sessions/by-code/${code}` });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ code: "room_not_found" });
  });

  it("rejects absurdly long codes as a bad request", async () => {
    const app = setup();

    const response = await app.inject({ method: "GET", url: `/api/sessions/by-code/${"A".repeat(40)}` });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ code: "bad_request" });
  });
});
