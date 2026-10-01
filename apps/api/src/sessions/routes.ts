import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { CreateSessionBodySchema } from "@gamemash/games/schemas";
import { isRoomCode, MS_PER_MINUTE, normalizeRoomCode } from "@gamemash/shared";
import {
  ApiErrorSchema,
  CreateSessionResponseSchema,
  JoinSessionBodySchema,
  JoinSessionResponseSchema,
  RoomLookupParamsSchema,
  RoomLookupResponseSchema,
  SessionParamsSchema,
} from "@gamemash/shared/schemas";
import { createRateLimiter } from "../limits/rate-limiter.js";
import { byClient, perMinute, sessionRateLimitKey } from "../limits/route-limits.js";
import { sendError } from "./error-body.js";
import type { SessionService } from "./service.js";

export type SessionRouteLimits = {
  sessionsPerMinute: number;
  lookupsPerMinute: number;
  lookupMissesPerTenMinutes: number;
  joinsPerSessionPerMinute: number;
  joinsPerMinute: number;
};

export const DEFAULT_SESSION_ROUTE_LIMITS: SessionRouteLimits = {
  sessionsPerMinute: 10,
  lookupsPerMinute: 300,
  lookupMissesPerTenMinutes: 200,
  joinsPerSessionPerMinute: 120,
  joinsPerMinute: 300,
};

export const sessionRoutes =
  (sessions: SessionService, limits: SessionRouteLimits = DEFAULT_SESSION_ROUTE_LIMITS): FastifyPluginAsyncTypebox =>
  async (app) => {
    const lookupMisses = createRateLimiter({ max: limits.lookupMissesPerTenMinutes, windowMs: 10 * MS_PER_MINUTE });
    const joins = createRateLimiter({ max: limits.joinsPerMinute, windowMs: MS_PER_MINUTE });

    app.post(
      "/api/sessions",
      {
        config: perMinute(limits.sessionsPerMinute, byClient),
        schema: {
          body: CreateSessionBodySchema,
          response: { 201: CreateSessionResponseSchema, 400: ApiErrorSchema },
        },
        preValidation: async (request) => {
          request.body ??= {};
        },
      },
      async (request, reply) => {
        const result = await sessions.createNamed(request.body.name ?? "");
        if (!result.ok) return sendError(reply, result.error);
        return reply.code(201).send(result.value);
      },
    );

    app.get(
      "/api/sessions/by-code/:code",
      {
        config: perMinute(limits.lookupsPerMinute, byClient),
        schema: {
          params: RoomLookupParamsSchema,
          response: { 200: RoomLookupResponseSchema, 404: ApiErrorSchema, 429: ApiErrorSchema },
        },
      },
      async (request, reply) => {
        const client = byClient(request);
        if (lookupMisses.isLimited(client)) return sendError(reply, "rate_limited");
        const roomCode = normalizeRoomCode(request.params.code);
        const session = isRoomCode(roomCode) ? await sessions.findByRoomCode(roomCode) : null;
        if (session) return { sessionId: session.id, status: session.status };
        lookupMisses.hit(client);
        return sendError(reply, "room_not_found");
      },
    );

    app.post(
      "/api/sessions/:sessionId/players",
      {
        config: perMinute(limits.joinsPerSessionPerMinute, sessionRateLimitKey),
        schema: {
          params: SessionParamsSchema,
          body: JoinSessionBodySchema,
          response: {
            201: JoinSessionResponseSchema,
            400: ApiErrorSchema,
            404: ApiErrorSchema,
            409: ApiErrorSchema,
            429: ApiErrorSchema,
          },
        },
      },
      async (request, reply) => {
        if (!joins.hit(byClient(request))) return sendError(reply, "rate_limited");
        const result = await sessions.join(request.params.sessionId, request.body.name);
        if (result.ok) return reply.code(201).send(result.value);
        return sendError(reply, result.error);
      },
    );
  };
