import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { SessionSetupSchema } from "@gamemash/games/schemas";
import type { ErrorCode } from "@gamemash/shared";
import { ApiErrorSchema, BearerAuthHeadersSchema, SessionParamsSchema } from "@gamemash/shared/schemas";
import type { FastifyRequest } from "fastify";
import { Type } from "typebox";
import { clientKey } from "../limits/client-key.js";
import { createRateLimiter } from "../limits/rate-limiter.js";
import { bearerToken } from "./bearer.js";
import type { SessionService } from "./service.js";
import type { SessionRecord } from "./store.js";

const MINUTE_MS = 60_000;
const SETUP_MAX_BYTES = 512 * 1024;
const READS_PER_MINUTE = 120;
const SAVES_PER_SESSION_PER_MINUTE = 300;
const REQUESTS_PER_ADDRESS_PER_MINUTE = 600;

const SETUP_ERROR_STATUS: Partial<Record<ErrorCode, 400 | 401 | 409>> = {
  bad_request: 400,
  unauthorized: 401,
  setup_locked: 409,
};

const sessionKey = (request: FastifyRequest) => {
  const { sessionId } = request.params as { sessionId?: unknown };
  return `${clientKey(request.ip)}:${typeof sessionId === "string" ? sessionId : ""}`;
};

export const setupRoutes =
  (sessions: SessionService): FastifyPluginAsyncTypebox =>
  async (app) => {
    const requests = createRateLimiter({ max: REQUESTS_PER_ADDRESS_PER_MINUTE, windowMs: MINUTE_MS });
    const hosts = new WeakMap<FastifyRequest, SessionRecord>();

    const hostOf = (request: FastifyRequest) => {
      const session = hosts.get(request);
      if (!session) throw new Error("setup route reached without an authenticated host");
      return session;
    };

    app.addHook("onRequest", async (request, reply) => {
      if (!requests.hit(clientKey(request.ip))) return reply.code(429).send({ code: "rate_limited" });
      const token = bearerToken(request.headers.authorization);
      const { sessionId } = request.params as { sessionId?: unknown };
      const session = token && typeof sessionId === "string" ? await sessions.authenticateHost(sessionId, token) : null;
      if (!session) return reply.code(401).send({ code: "unauthorized" });
      hosts.set(request, session);
    });

    app.get(
      "/api/sessions/:sessionId/setup",
      {
        config: { rateLimit: { max: READS_PER_MINUTE, timeWindow: MINUTE_MS, keyGenerator: sessionKey } },
        schema: {
          params: SessionParamsSchema,
          headers: BearerAuthHeadersSchema,
          response: { 200: SessionSetupSchema, 401: ApiErrorSchema },
        },
      },
      async (request) => sessions.getSetup(hostOf(request)),
    );

    app.put(
      "/api/sessions/:sessionId/setup",
      {
        bodyLimit: SETUP_MAX_BYTES,
        config: { rateLimit: { max: SAVES_PER_SESSION_PER_MINUTE, timeWindow: MINUTE_MS, keyGenerator: sessionKey } },
        schema: {
          params: SessionParamsSchema,
          headers: BearerAuthHeadersSchema,
          body: SessionSetupSchema,
          response: { 204: Type.Null(), 400: ApiErrorSchema, 401: ApiErrorSchema, 409: ApiErrorSchema },
        },
      },
      async (request, reply) => {
        const result = await sessions.saveSetup(hostOf(request), request.body);
        if (result.ok) return reply.code(204).send(null);
        return reply.code(SETUP_ERROR_STATUS[result.error] ?? 400).send({ code: result.error });
      },
    );
  };
