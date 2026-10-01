import type { CreateSessionResponse } from "@gamemash/shared";
import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { healthyRedis } from "../test-app.js";
import { createMemorySessionStore } from "./memory-store.js";
import type { SessionRouteLimits } from "./routes.js";
import { createSessionService } from "./service.js";

const setup = (rateLimit = false, limits: Partial<SessionRouteLimits> = {}) =>
  buildApp({
    redis: healthyRedis,
    rateLimit,
    limits,
    sessions: createSessionService({ store: createMemorySessionStore() }),
  });

const createSession = async (app: ReturnType<typeof setup>) =>
  (await app.inject({ method: "POST", url: "/api/sessions" })).json<CreateSessionResponse>();

const join = (app: ReturnType<typeof setup>, sessionId: string, name: unknown) =>
  app.inject({ method: "POST", url: `/api/sessions/${sessionId}/players`, payload: { name } });

describe("POST /api/sessions/:sessionId/players", () => {
  it("returns a player id and token", async () => {
    const app = setup();
    const { sessionId } = await createSession(app);

    const response = await join(app, sessionId, "Priya");

    expect(response.statusCode).toBe(201);
    expect(Object.keys(response.json()).sort()).toEqual(["playerId", "playerToken"]);
  });

  it("returns 409 name_taken for a duplicate name", async () => {
    const app = setup();
    const { sessionId } = await createSession(app);
    await join(app, sessionId, "Priya");

    const response = await join(app, sessionId, "priya");

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ code: "name_taken" });
  });

  it("returns 400 invalid_name with the maximum length", async () => {
    const app = setup();
    const { sessionId } = await createSession(app);

    const response = await join(app, sessionId, "   ");

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ code: "invalid_name", params: { max: 20 } });
  });

  it("returns 404 room_not_found for an unknown session", async () => {
    const app = setup();

    const response = await join(app, "00000000-0000-4000-8000-000000000000", "Priya");

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ code: "room_not_found" });
  });

  it.each([30, 65, 256])("returns invalid_name for a %i character name", async (length) => {
    const app = setup();
    const { sessionId } = await createSession(app);

    const response = await join(app, sessionId, "x".repeat(length));

    expect(response.json()).toEqual({ code: "invalid_name", params: { max: 20 } });
  });

  it("returns 400 bad_request for a malformed session id or body", async () => {
    const app = setup();

    expect((await join(app, "not-a-uuid", "Priya")).json()).toEqual({ code: "bad_request" });
    expect((await join(app, "00000000-0000-4000-8000-000000000000", 42)).statusCode).toBe(400);
  });
});

describe("rate limiting", () => {
  it("returns 429 rate_limited after too many sessions from one address", async () => {
    const app = setup(true);
    const responses = [];
    for (let attempt = 0; attempt < 11; attempt += 1) {
      responses.push(await app.inject({ method: "POST", url: "/api/sessions" }));
    }
    const last = responses.at(-1);

    expect(responses.slice(0, 10).every((response) => response.statusCode === 201)).toBe(true);
    expect(last?.statusCode).toBe(429);
    expect(last?.json()).toEqual({ code: "rate_limited" });
  });

  it("lets a whole office behind one address join the same session", async () => {
    const app = setup(true);
    const { sessionId } = await createSession(app);
    const responses = [];
    for (let player = 0; player < 100; player += 1) {
      responses.push(await join(app, sessionId, `Player ${player}`));
    }

    expect(responses.every((response) => response.statusCode === 201)).toBe(true);
  });

  it("cannot be bypassed by adding a query string", async () => {
    const app = setup(true, { joinsPerSessionPerMinute: 3 });
    const { sessionId } = await createSession(app);
    const statuses = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await app.inject({
        method: "POST",
        url: `/api/sessions/${sessionId}/players?x=${attempt}`,
        payload: { name: `Player ${attempt}` },
      });
      statuses.push(response.statusCode);
    }

    expect(statuses).toEqual([201, 201, 201, 429, 429]);
  });

  it("limits joins per address across all sessions", async () => {
    const app = setup(false, { joinsPerMinute: 2 });
    const first = await createSession(app);
    const second = await createSession(app);

    await join(app, first.sessionId, "A");
    await join(app, second.sessionId, "B");
    const response = await join(app, second.sessionId, "C");

    expect(response.statusCode).toBe(429);
    expect(response.json()).toEqual({ code: "rate_limited" });
  });

  it("stops an address that keeps guessing room codes", async () => {
    const app = setup(false, { lookupMissesPerTenMinutes: 3 });
    const { roomCode } = await createSession(app);
    for (const guess of ["AAAA", "BBBB", "CCCC"]) {
      await app.inject({ method: "GET", url: `/api/sessions/by-code/${guess}` });
    }

    const response = await app.inject({ method: "GET", url: `/api/sessions/by-code/${roomCode}` });

    expect(response.statusCode).toBe(429);
    expect(response.json()).toEqual({ code: "rate_limited" });
  });
});
