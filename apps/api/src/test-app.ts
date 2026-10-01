import type { RedisHealth } from "./redis.js";

export const healthyRedis: RedisHealth = { ping: async () => "PONG", isReady: true };
