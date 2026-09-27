import type { ApiError, HealthResponse } from "@gamemash/shared";
import Fastify, { type FastifyServerOptions } from "fastify";
import type { RedisPing } from "./redis.js";

export type AppDeps = {
  redis: RedisPing;
};

const isRedisUp = async (redis: RedisPing) => {
  try {
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
};

export const buildApp = ({ redis }: AppDeps, options: FastifyServerOptions = {}) => {
  const app = Fastify(options);

  app.get(
    "/api/health",
    async (): Promise<HealthResponse> => ({
      status: "ok",
      redis: (await isRedisUp(redis)) ? "up" : "down",
    }),
  );

  app.setNotFoundHandler((_request, reply) => {
    const body: ApiError = { code: "not_found" };
    return reply.code(404).send(body);
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, "unhandled error");
    const body: ApiError = { code: "internal_error" };
    return reply.code(500).send(body);
  });

  return app;
};
