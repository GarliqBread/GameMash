import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { type ErrorCode, isRoomCode, normalizeRoomCode, PLAYER_NAME_MAX_LENGTH } from "@gamemash/shared";
import {
  ApiErrorSchema,
  CreateSessionResponseSchema,
  JoinSessionBodySchema,
  JoinSessionResponseSchema,
  RoomLookupParamsSchema,
  RoomLookupResponseSchema,
  SessionParamsSchema,
} from "@gamemash/shared/schemas";
import type { FastifyRequest } from "fastify";
import { clientKey } from "../limits/client-key.js";
import { createRateLimiter } from "../limits/rate-limiter.js";
import type { SessionService } from "./service.js";

const MINUTE_MS = 60_000;

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

const JOIN_ERROR_STATUS: Partial<Record<ErrorCode, 400 | 404 | 409>> = {
  invalid_name: 400,
  room_not_found: 404,
  name_taken: 409,
  session_full: 409,
  session_ended: 409,
};

const byClient = (request: FastifyRequest) => clientKey(request.ip);

const joinKey = (request: FastifyRequest) => {
  const { sessionId } = request.params as { sessionId?: unknown };
  return `${byClient(request)}:${typeof sessionId === "string" ? sessionId : ""}`;
};

export const sessionRoutes =
  (sessions: SessionService, limits: SessionRouteLimits = DEFAULT_SESSION_ROUTE_LIMITS): FastifyPluginAsyncTypebox =>
  async (app) => {
    const lookupMisses = createRateLimiter({ max: limits.lookupMissesPerTenMinutes, windowMs: 10 * MINUTE_MS });
    const joins = createRateLimiter({ max: limits.joinsPerMinute, windowMs: MINUTE_MS });

    app.post(
      "/api/sessions",
      {
        config: { rateLimit: { max: limits.sessionsPerMinute, timeWindow: MINUTE_MS, keyGenerator: byClient } },
        schema: { response: { 201: CreateSessionResponseSchema } },
      },
      async (_request, reply) => reply.code(201).send(await sessions.create()),
    );

    app.get(
      "/api/sessions/by-code/:code",
      {
        config: { rateLimit: { max: limits.lookupsPerMinute, timeWindow: MINUTE_MS, keyGenerator: byClient } },
        schema: {
          params: RoomLookupParamsSchema,
          response: { 200: RoomLookupResponseSchema, 404: ApiErrorSchema, 429: ApiErrorSchema },
        },
      },
      async (request, reply) => {
        const client = byClient(request);
        if (lookupMisses.isLimited(client)) return reply.code(429).send({ code: "rate_limited" });
        const roomCode = normalizeRoomCode(request.params.code);
        const session = isRoomCode(roomCode) ? await sessions.findByRoomCode(roomCode) : null;
        if (session) return { sessionId: session.id, status: session.status };
        lookupMisses.hit(client);
        return reply.code(404).send({ code: "room_not_found" });
      },
    );

    app.post(
      "/api/sessions/:sessionId/players",
      {
        config: { rateLimit: { max: limits.joinsPerSessionPerMinute, timeWindow: MINUTE_MS, keyGenerator: joinKey } },
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
        if (!joins.hit(byClient(request))) return reply.code(429).send({ code: "rate_limited" });
        const result = await sessions.join(request.params.sessionId, request.body.name);
        if (result.ok) return reply.code(201).send(result.value);
        const status = JOIN_ERROR_STATUS[result.error] ?? 400;
        if (result.error === "invalid_name") {
          return reply.code(status).send({ code: result.error, params: { max: PLAYER_NAME_MAX_LENGTH } });
        }
        return reply.code(status).send({ code: result.error });
      },
    );
  };
