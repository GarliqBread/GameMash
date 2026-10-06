import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { limitRequestsAtOnce } from "./request-slots.js";

const setup = (limits: { max: number; perClient: number }) => {
  const app = Fastify();
  const waiting: (() => void)[] = [];
  limitRequestsAtOnce(app, limits);
  app.get("/slow", () => new Promise<string>((resolve) => waiting.push(() => resolve("done"))));
  const request = (ip: string) => app.inject({ method: "GET", url: "/slow", remoteAddress: ip });
  const releaseAll = () => {
    for (const release of waiting.splice(0)) release();
  };
  const settle = () => new Promise((resolve) => setTimeout(resolve, 20));
  return { request, releaseAll, settle };
};

describe("requests at once", () => {
  it("lets one client hold only its own share of the slots", async () => {
    const { request, releaseAll, settle } = setup({ max: 3, perClient: 1 });

    const first = request("203.0.113.1");
    await settle();
    const second = await request("203.0.113.1");
    const other = request("203.0.113.2");
    await settle();
    releaseAll();

    expect(second.statusCode).toBe(429);
    expect((await first).statusCode).toBe(200);
    expect((await other).statusCode).toBe(200);
  });

  it("stops at the server-wide limit and frees slots when requests finish", async () => {
    const { request, releaseAll, settle } = setup({ max: 2, perClient: 1 });

    const held = [request("203.0.113.1"), request("203.0.113.2")];
    await settle();
    const refused = await request("203.0.113.3");
    releaseAll();
    await Promise.all(held);
    const later = request("203.0.113.3");
    await settle();
    releaseAll();

    expect(refused.statusCode).toBe(429);
    expect((await later).statusCode).toBe(200);
  });
});
