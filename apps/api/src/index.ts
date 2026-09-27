import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { connectRedis } from "./redis.js";
import { attachSocket } from "./socket.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

const config = loadConfig();

const redis = await connectRedis(config.redisUrl, (error) => {
  console.error("Redis error", error);
});

const app = buildApp({ redis }, { logger: { level: config.logLevel } });
const io = attachSocket(app.server, app.log);

let isShuttingDown = false;

const shutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  app.log.info({ signal }, "shutting down");

  const forceExit = setTimeout(() => {
    app.log.error({ timeoutMs: SHUTDOWN_TIMEOUT_MS }, "shutdown timed out, forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    await io.close();
    await app.close();
    await redis.quit();
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, "shutdown failed");
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({ host: config.host, port: config.port });
