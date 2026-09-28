import { createRedisClient } from "../redis.js";

const TEST_REDIS_URL = process.env.TEST_REDIS_URL ?? "redis://localhost:6380";
const CONNECT_TIMEOUT_MS = 1000;

export const connectTestRedis = async () => {
  const client = createRedisClient(TEST_REDIS_URL, false, CONNECT_TIMEOUT_MS);
  client.on("error", () => {});
  try {
    await client.connect();
    return client;
  } catch (error) {
    if (process.env.CI) throw new Error("Redis is required for tests in CI", { cause: error });
    return undefined;
  }
};
