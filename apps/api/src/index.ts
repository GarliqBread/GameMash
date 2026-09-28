import { gameRules } from "@gamemash/games/server";
import pino from "pino";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createGameRunner } from "./game/runner.js";
import { createLobbyNotifier } from "./lobby/notifier.js";
import { attachLobby } from "./lobby/socket.js";
import { createRedis } from "./redis.js";
import { createRedisSessionStore } from "./sessions/redis-store.js";
import { createSessionService } from "./sessions/service.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

const config = loadConfig();
const log = pino({ level: config.logLevel });
const redis = createRedis(config.redisUrl, log);
const notifier = createLobbyNotifier();
const store = createRedisSessionStore(redis);
const sessions = createSessionService({ store, notifier, log });
const game = createGameRunner({ store, readSetup: sessions.readSetup, rules: gameRules, log });
const app = buildApp(
  { redis, sessions },
  { loggerInstance: log, trustProxy: config.trustProxy.length > 0 ? config.trustProxy.join(",") : false },
);
const lobby = attachLobby(app.server, { log: app.log, sessions, notifier, game, trustProxy: config.trustProxy });

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
    await lobby.close();
    await app.close();
    if (redis.isOpen) await redis.close();
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, "shutdown failed");
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

redis.connect().catch((error: unknown) => {
  app.log.error({ err: error }, "redis connect failed");
});

await app.listen({ host: config.host, port: config.port });
