import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import type { RedisHealth } from "./redis.js";
import { createMemorySessionStore } from "./sessions/memory-store.js";
import { createSessionService } from "./sessions/service.js";
import { healthyRedis } from "./test-app.js";

const fakeRedis = (ping: () => Promise<string>, isReady = true): RedisHealth => ({ ping, isReady });

const sessions = () => createSessionService({ store: createMemorySessionStore() });

describe("GET /api/health", () => {
  it("reports redis up when ping succeeds", async () => {
    const app = buildApp({ redis: healthyRedis, sessions: sessions() });

    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", redis: "up" });
  });

  it("reports redis down when ping throws", async () => {
    const app = buildApp({
      sessions: sessions(),
      redis: fakeRedis(async () => {
        throw new Error("connection refused");
      }),
    });

    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.json()).toEqual({ status: "ok", redis: "down" });
  });

  it("reports redis down without pinging when the client is not ready", async () => {
    let pinged = false;
    const app = buildApp({
      sessions: sessions(),
      redis: fakeRedis(async () => {
        pinged = true;
        return "PONG";
      }, false),
    });

    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.json()).toEqual({ status: "ok", redis: "down" });
    expect(pinged).toBe(false);
  });
});

describe("error responses", () => {
  it("returns a not_found code for unknown routes", async () => {
    const app = buildApp({ redis: healthyRedis, sessions: sessions() });

    const response = await app.inject({ method: "GET", url: "/api/nope" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ code: "not_found" });
  });

  it("keeps the status and returns bad_request for malformed bodies", async () => {
    const app = buildApp({ redis: healthyRedis, sessions: sessions() });
    app.post("/api/echo", async (request) => request.body);

    const response = await app.inject({
      method: "POST",
      url: "/api/echo",
      headers: { "content-type": "application/json" },
      payload: "{not json",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ code: "bad_request" });
  });

  it("returns bad_request for schema validation failures", async () => {
    const app = buildApp({ redis: healthyRedis, sessions: sessions() });
    app.post(
      "/api/echo",
      { schema: { body: { type: "object", required: ["name"], properties: { name: { type: "string" } } } } },
      async (request) => request.body,
    );

    const response = await app.inject({ method: "POST", url: "/api/echo", payload: {} });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ code: "bad_request" });
  });

  it("returns bad_request for malformed URLs", async () => {
    const app = buildApp({ redis: healthyRedis, sessions: sessions() });

    const response = await app.inject({ method: "GET", url: "/api/%E0%A4%A" });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ code: "bad_request" });
  });

  it("returns internal_error for unexpected failures", async () => {
    const app = buildApp({ redis: healthyRedis, sessions: sessions() });
    app.get("/api/boom", async () => {
      throw new Error("boom");
    });

    const response = await app.inject({ method: "GET", url: "/api/boom" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ code: "internal_error" });
  });
});
