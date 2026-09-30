import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { AVATAR_CONTENT_TYPES, AVATAR_MAX_BYTES, type ErrorCode } from "@gamemash/shared";
import { ApiErrorSchema, BearerAuthHeadersSchema, CharacterSchema, PlayerParamsSchema } from "@gamemash/shared/schemas";
import type { FastifyReply, FastifyRequest } from "fastify";
import { Type } from "typebox";
import { clientKey } from "../limits/client-key.js";
import { createRateLimiter } from "../limits/rate-limiter.js";
import { bearerToken } from "./bearer.js";
import type { SessionService } from "./service.js";

const MINUTE_MS = 60_000;
const CHANGES_PER_PLAYER_PER_MINUTE = 10;
const CHANGES_PER_ADDRESS_PER_MINUTE = 120;
const DOWNLOADS_PER_ADDRESS_PER_MINUTE = 3000;

const CHANGE_ERROR_STATUS: Partial<Record<ErrorCode, 400 | 401 | 409>> = {
  unauthorized: 401,
  avatar_locked: 409,
};

const sendError = (reply: FastifyReply, code: ErrorCode) => reply.code(CHANGE_ERROR_STATUS[code] ?? 400).send({ code });

const changeErrors = {
  400: ApiErrorSchema,
  401: ApiErrorSchema,
  409: ApiErrorSchema,
  429: ApiErrorSchema,
};

const changeKey = (request: FastifyRequest) => {
  const { playerId } = request.params as { playerId?: unknown };
  return `${clientKey(request.ip)}:${typeof playerId === "string" ? playerId : ""}`;
};

export const avatarRoutes =
  (sessions: SessionService): FastifyPluginAsyncTypebox =>
  async (app) => {
    const changes = createRateLimiter({ max: CHANGES_PER_ADDRESS_PER_MINUTE, windowMs: MINUTE_MS });

    app.addContentTypeParser(
      AVATAR_CONTENT_TYPES,
      { parseAs: "buffer", bodyLimit: AVATAR_MAX_BYTES },
      (_request, body, done) => done(null, body),
    );

    const perPlayer = {
      rateLimit: { max: CHANGES_PER_PLAYER_PER_MINUTE, timeWindow: MINUTE_MS, keyGenerator: changeKey },
    };

    app.put(
      "/api/sessions/:sessionId/players/:playerId/avatar",
      {
        bodyLimit: AVATAR_MAX_BYTES,
        config: perPlayer,
        schema: {
          params: PlayerParamsSchema,
          headers: BearerAuthHeadersSchema,
          response: {
            200: Type.Object({ avatarVersion: Type.Number() }),
            415: ApiErrorSchema,
            ...changeErrors,
          },
        },
      },
      async (request, reply) => {
        if (!changes.hit(clientKey(request.ip))) return reply.code(429).send({ code: "rate_limited" });
        if (!Buffer.isBuffer(request.body)) return reply.code(415).send({ code: "unsupported_media_type" });
        const token = bearerToken(request.headers.authorization);
        if (!token) return reply.code(401).send({ code: "unauthorized" });
        const { sessionId, playerId } = request.params;
        const result = await sessions.setAvatar(sessionId, playerId, token, request.body);
        if (result.ok) return { avatarVersion: result.value.version };
        return sendError(reply, result.error);
      },
    );

    app.delete(
      "/api/sessions/:sessionId/players/:playerId/avatar",
      {
        config: perPlayer,
        schema: {
          params: PlayerParamsSchema,
          headers: BearerAuthHeadersSchema,
          response: { 204: Type.Null(), ...changeErrors },
        },
      },
      async (request, reply) => {
        if (!changes.hit(clientKey(request.ip))) return reply.code(429).send({ code: "rate_limited" });
        const token = bearerToken(request.headers.authorization);
        if (!token) return reply.code(401).send({ code: "unauthorized" });
        const { sessionId, playerId } = request.params;
        const result = await sessions.removeAvatar(sessionId, playerId, token);
        if (result.ok) return reply.code(204).send(null);
        return sendError(reply, result.error);
      },
    );

    app.put(
      "/api/sessions/:sessionId/players/:playerId/character",
      {
        config: perPlayer,
        schema: {
          params: PlayerParamsSchema,
          headers: BearerAuthHeadersSchema,
          body: CharacterSchema,
          response: { 204: Type.Null(), ...changeErrors },
        },
      },
      async (request, reply) => {
        if (!changes.hit(clientKey(request.ip))) return reply.code(429).send({ code: "rate_limited" });
        const token = bearerToken(request.headers.authorization);
        if (!token) return reply.code(401).send({ code: "unauthorized" });
        const { sessionId, playerId } = request.params;
        const result = await sessions.setCharacter(sessionId, playerId, token, request.body);
        if (result.ok) return reply.code(204).send(null);
        return sendError(reply, result.error);
      },
    );

    app.get(
      "/api/sessions/:sessionId/players/:playerId/avatar",
      {
        config: {
          rateLimit: {
            max: DOWNLOADS_PER_ADDRESS_PER_MINUTE,
            timeWindow: MINUTE_MS,
            keyGenerator: (request) => clientKey(request.ip),
          },
        },
        schema: { params: PlayerParamsSchema },
      },
      async (request, reply) => {
        const avatar = await sessions.getAvatar(request.params.sessionId, request.params.playerId);
        if (!avatar) return reply.code(404).send({ code: "not_found" });
        return reply
          .header("content-type", avatar.type)
          .header("cache-control", "no-store")
          .header("x-content-type-options", "nosniff")
          .header("content-security-policy", "default-src 'none'; sandbox")
          .send(avatar.bytes);
      },
    );
  };
