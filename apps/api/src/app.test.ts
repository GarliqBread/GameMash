import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

const fakeRedis = (ping: () => Promise<string>) => ({ ping }) as Parameters<typeof buildApp>[0]["redis"];

describe("GET /api/health", () => {
  it("reports redis up when ping succeeds", async () => {
    const app = buildApp({ redis: fakeRedis(async () => "PONG") });

    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", redis: "up" });
  });

  it("reports redis down when ping throws", async () => {
    const app = buildApp({
      redis: fakeRedis(async () => {
        throw new Error("connection refused");
      }),
    });

    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.json()).toEqual({ status: "ok", redis: "down" });
  });
});

describe("unknown routes", () => {
  it("returns a not_found error code", async () => {
    const app = buildApp({ redis: fakeRedis(async () => "PONG") });

    const response = await app.inject({ method: "GET", url: "/api/nope" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ code: "not_found" });
  });
});
