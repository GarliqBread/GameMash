import { createClient } from "redis";

export type RedisClient = ReturnType<typeof createClient>;

export type RedisPing = Pick<RedisClient, "ping">;

export const connectRedis = async (url: string, onError: (error: unknown) => void) => {
  const client = createClient({ url });
  client.on("error", onError);
  await client.connect();
  return client;
};
