import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { HostSetupResponseSchema, SessionSetupSchema } from "@gamemash/games/schemas";
import type { ErrorCode } from "@gamemash/shared";
import { ApiErrorSchema, BearerAuthHeadersSchema, SessionParamsSchema } from "@gamemash/shared/schemas";
import { Type } from "typebox";
import { requireHost, sessionRateLimitKey } from "./auth.js";
import type { SessionService } from "./service.js";

const MINUTE_MS = 60_000;
const SETUP_MAX_BYTES = 2 * 1024 * 1024;
const READS_PER_MINUTE = 120;
const SAVES_PER_SESSION_PER_MINUTE = 300;
const REQUESTS_PER_ADDRESS_PER_MINUTE = 600;

const SETUP_ERROR_STATUS: Partial<Record<ErrorCode, 400 | 401 | 409>> = {
  bad_request: 400,
  unauthorized: 401,
  setup_locked: 409,
};

export const setupRoutes =
  (sessions: SessionService): FastifyPluginAsyncTypebox =>
  async (app) => {
    const hostOf = requireHost(app, sessions, REQUESTS_PER_ADDRESS_PER_MINUTE);

    app.get(
      "/api/sessions/:sessionId/setup",
      {
        config: { rateLimit: { max: READS_PER_MINUTE, timeWindow: MINUTE_MS, keyGenerator: sessionRateLimitKey } },
        schema: {
          params: SessionParamsSchema,
          headers: BearerAuthHeadersSchema,
          response: { 200: HostSetupResponseSchema, 401: ApiErrorSchema },
        },
      },
      async (request) => ({
        setup: await sessions.getSetup(hostOf(request)),
        imagesEnabled: sessions.imagesEnabled,
      }),
    );

    app.put(
      "/api/sessions/:sessionId/setup",
      {
        bodyLimit: SETUP_MAX_BYTES,
        config: {
          rateLimit: { max: SAVES_PER_SESSION_PER_MINUTE, timeWindow: MINUTE_MS, keyGenerator: sessionRateLimitKey },
        },
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
