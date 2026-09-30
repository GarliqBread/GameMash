import { describe, expect, it } from "vitest";
import { clientKey } from "./client-key.js";
import { createConcurrencyLimit } from "./concurrency-limit.js";
import { createRateLimiter } from "./rate-limiter.js";

describe("clientKey", () => {
  it("keeps IPv4 addresses as they are, including IPv4-mapped IPv6", () => {
    expect(clientKey("203.0.113.7")).toBe("203.0.113.7");
    expect(clientKey("::ffff:203.0.113.7")).toBe("203.0.113.7");
  });

  it("groups IPv6 addresses by their /64 network", () => {
    const first = clientKey("2001:db8:1:2:aaaa::1");
    expect(first).toBe("2001:0db8:0001:0002::/64");
    expect(clientKey("2001:DB8:1:2:ffff:ffff:ffff:ffff")).toBe(first);
    expect(clientKey("2001:db8:1:3::1")).not.toBe(first);
    expect(clientKey("::1")).toBe("0000:0000:0000:0000::/64");
  });
});

describe("createRateLimiter", () => {
  it("allows up to the maximum per window, then refuses until the window resets", () => {
    let now = 0;
    const limiter = createRateLimiter({ max: 2, windowMs: 1000, now: () => now });

    expect([limiter.hit("a"), limiter.hit("a"), limiter.hit("a")]).toEqual([true, true, false]);
    expect(limiter.isLimited("a")).toBe(true);
    expect(limiter.hit("b")).toBe(true);

    now = 1000;
    expect(limiter.hit("a")).toBe(true);
  });

  it("forgets the oldest keys instead of growing without bound", () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000, maxKeys: 2 });
    limiter.hit("a");
    limiter.hit("b");
    limiter.hit("c");

    expect(limiter.isLimited("a")).toBe(false);
    expect(limiter.isLimited("c")).toBe(true);
  });
});

describe("concurrency limit", () => {
  it("turns away work beyond the limit and frees the slot when work ends, even on failure", async () => {
    const limit = createConcurrencyLimit(1);
    let release = () => {};
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });

    const first = limit.run(() => blocked.then(() => "first"));
    expect(await limit.run(async () => "second")).toEqual({ ok: false });
    release();
    expect(await first).toEqual({ ok: true, value: "first" });

    await expect(limit.run(async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    expect(await limit.run(async () => "third")).toEqual({ ok: true, value: "third" });
  });
});
