import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("uses defaults when env is empty", () => {
    expect(loadConfig({})).toEqual({
      host: "0.0.0.0",
      port: 3000,
      redisUrl: "redis://localhost:6380",
      logLevel: "info",
      trustProxy: [],
    });
  });

  it("reads trusted proxies as a comma-separated list", () => {
    expect(loadConfig({ TRUST_PROXY: "loopback, 10.0.0.0/8" }).trustProxy).toEqual(["loopback", "10.0.0.0/8"]);
  });

  it("rejects an invalid port", () => {
    expect(() => loadConfig({ PORT: "abc" })).toThrow('Invalid PORT: "abc"');
  });
});
