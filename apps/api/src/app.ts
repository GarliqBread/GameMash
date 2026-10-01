import rateLimit from "@fastify/rate-limit";
import type { HealthResponse } from "@gamemash/shared";
import Fastify, { type FastifyError, type FastifyReply, type FastifyRequest, type FastifyServerOptions } from "fastify";
import { type GameUploads, uploadRoutes } from "./game/upload-routes.js";
import { imageFileRoutes } from "./media/image-file-routes.js";
import type { ImageStore } from "./media/image-store.js";
import type { RedisHealth } from "./redis.js";
import { avatarRoutes } from "./sessions/avatar-routes.js";
import { errorBody, sendError } from "./sessions/error-body.js";
import { imageRoutes } from "./sessions/image-routes.js";
import { DEFAULT_SESSION_ROUTE_LIMITS, type SessionRouteLimits, sessionRoutes } from "./sessions/routes.js";
import type { SessionService } from "./sessions/service.js";
import { setupRoutes } from "./sessions/setup-routes.js";

export type AppDeps = {
  redis: RedisHealth;
  sessions: SessionService;
  rateLimit?: boolean | undefined;
  limits?: Partial<SessionRouteLimits> | undefined;
  imageFiles?: ImageStore | undefined;
  uploads?: GameUploads | undefined;
};

const INTERNAL_ERROR = 500;

const statusCodeOf = (error: unknown) => {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) return INTERNAL_ERROR;
  const { statusCode } = error;
  return typeof statusCode === "number" ? statusCode : INTERNAL_ERROR;
};

const TOO_MANY_REQUESTS = 429;
const PAYLOAD_TOO_LARGE = 413;
const UNSUPPORTED_MEDIA_TYPE = 415;

const isClientError = (statusCode: number) => statusCode >= 400 && statusCode < 500;

const isRedisUp = async (redis: RedisHealth) => {
  if (!redis.isReady) return false;
  try {
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
};

const badRequest = errorBody("bad_request");

const rejectMalformedRequest = (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
  request.log.info({ err: error }, "rejected malformed request");
  return sendError(reply, "bad_request");
};

export const buildApp = (
  { redis, sessions, rateLimit: isRateLimited = true, limits, imageFiles, uploads }: AppDeps,
  options: FastifyServerOptions = {},
) => {
  const app = Fastify({
    ...options,
    frameworkErrors: rejectMalformedRequest,
    ajv: { customOptions: { coerceTypes: false, removeAdditional: false } },
  });

  app.get(
    "/api/health",
    async (): Promise<HealthResponse> => ({
      status: "ok",
      redis: (await isRedisUp(redis)) ? "up" : "down",
    }),
  );

  if (isRateLimited) app.register(rateLimit, { global: false, enableDraftSpec: true });
  app.register(sessionRoutes(sessions, { ...DEFAULT_SESSION_ROUTE_LIMITS, ...limits }));
  app.register(avatarRoutes(sessions));
  app.register(setupRoutes(sessions));
  app.register(imageRoutes(sessions));
  if (imageFiles) app.register(imageFileRoutes(imageFiles));
  if (uploads) app.register(uploadRoutes(sessions, uploads));

  app.setNotFoundHandler((_request, reply) => sendError(reply, "not_found"));

  app.setErrorHandler((error, request, reply) => {
    const statusCode = statusCodeOf(error);
    if (statusCode === TOO_MANY_REQUESTS) return sendError(reply, "rate_limited");
    if (statusCode === PAYLOAD_TOO_LARGE) return sendError(reply, "payload_too_large");
    if (statusCode === UNSUPPORTED_MEDIA_TYPE) return sendError(reply, "unsupported_media_type");
    if (isClientError(statusCode)) {
      request.log.info({ err: error }, "client error");
      return reply.code(statusCode).send(badRequest);
    }
    request.log.error({ err: error }, "unhandled error");
    return sendError(reply, "internal_error");
  });

  return app;
};
