import { createClient } from "redis";
import { sessionScripts } from "./sessions/scripts.js";

export type RedisLogger = {
  error: (details: { err: unknown }, message: string) => void;
  info: (message: string) => void;
};

type ReconnectStrategy = false | ((retries: number) => number | Error);

export const createRedisClient = (url: string, reconnectStrategy?: ReconnectStrategy, connectTimeout?: number) =>
  createClient({
    url,
    scripts: sessionScripts,
    socket: {
      ...(reconnectStrategy !== undefined && { reconnectStrategy }),
      ...(connectTimeout !== undefined && { connectTimeout }),
    },
  });

export type RedisClient = ReturnType<typeof createRedisClient>;

export type RedisHealth = Pick<RedisClient, "ping" | "isReady">;

export const createRedis = (url: string, log: RedisLogger): RedisClient => {
  const client = createRedisClient(url);
  let isHealthy = true;

  client.on("error", (error: unknown) => {
    if (!isHealthy) return;
    isHealthy = false;
    log.error({ err: error }, "redis unavailable, retrying in the background");
  });

  client.on("ready", () => {
    if (isHealthy) return;
    isHealthy = true;
    log.info("redis connection restored");
  });

  return client;
};
