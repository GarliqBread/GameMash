import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { AVATAR_CONTENT_TYPES, AVATAR_MAX_BYTES } from "@gamemash/shared";
import { ApiErrorSchema, BearerAuthHeadersSchema, PlayerParamsSchema } from "@gamemash/shared/schemas";
import type { FastifyRequest } from "fastify";
import { Type } from "typebox";
import { clientKey } from "../limits/client-key.js";
import { createRateLimiter } from "../limits/rate-limiter.js";
import { bearerToken } from "./bearer.js";
import type { SessionService } from "./service.js";

const MINUTE_MS = 60_000;
const UPLOADS_PER_PLAYER_PER_MINUTE = 10;
const UPLOADS_PER_ADDRESS_PER_MINUTE = 120;
const DOWNLOADS_PER_ADDRESS_PER_MINUTE = 3000;

const uploadKey = (request: FastifyRequest) => {
  const { playerId } = request.params as { playerId?: unknown };
  return `${clientKey(request.ip)}:${typeof playerId === "string" ? playerId : ""}`;
};

export const avatarRoutes =
  (sessions: SessionService): FastifyPluginAsyncTypebox =>
  async (app) => {
    const uploads = createRateLimiter({ max: UPLOADS_PER_ADDRESS_PER_MINUTE, windowMs: MINUTE_MS });

    app.addContentTypeParser(
      AVATAR_CONTENT_TYPES,
      { parseAs: "buffer", bodyLimit: AVATAR_MAX_BYTES },
      (_request, body, done) => done(null, body),
    );

    app.put(
      "/api/sessions/:sessionId/players/:playerId/avatar",
      {
        bodyLimit: AVATAR_MAX_BYTES,
        config: { rateLimit: { max: UPLOADS_PER_PLAYER_PER_MINUTE, timeWindow: MINUTE_MS, keyGenerator: uploadKey } },
        schema: {
          params: PlayerParamsSchema,
          headers: BearerAuthHeadersSchema,
          response: {
            200: Type.Object({ avatarVersion: Type.Number() }),
            400: ApiErrorSchema,
            401: ApiErrorSchema,
            415: ApiErrorSchema,
            429: ApiErrorSchema,
          },
        },
      },
      async (request, reply) => {
        if (!uploads.hit(clientKey(request.ip))) return reply.code(429).send({ code: "rate_limited" });
        if (!Buffer.isBuffer(request.body)) return reply.code(415).send({ code: "unsupported_media_type" });
        const token = bearerToken(request.headers.authorization);
        if (!token) return reply.code(401).send({ code: "unauthorized" });
        const { sessionId, playerId } = request.params;
        const result = await sessions.setAvatar(sessionId, playerId, token, request.body);
        if (result.ok) return { avatarVersion: result.value.version };
        return reply.code(result.error === "unauthorized" ? 401 : 400).send({ code: result.error });
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
