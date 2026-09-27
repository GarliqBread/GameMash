export type Config = {
  host: string;
  port: number;
  redisUrl: string;
  logLevel: string;
};

const DEFAULT_PORT = 3000;

const parsePort = (raw: string | undefined) => {
  if (raw === undefined || raw === "") return DEFAULT_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: "${raw}"`);
  }
  return port;
};

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => ({
  host: env.HOST || "0.0.0.0",
  port: parsePort(env.PORT),
  redisUrl: env.REDIS_URL || "redis://localhost:6380",
  logLevel: env.LOG_LEVEL || "info",
});
