import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { AVATAR_CONTENT_TYPES, AVATAR_MAX_BYTES } from "@gamemash/shared";
import { ApiErrorSchema, BearerAuthHeadersSchema, CharacterSchema, PlayerParamsSchema } from "@gamemash/shared/schemas";
import { Type } from "typebox";
import { byClient, byClientAndParam, perMinute } from "../limits/route-limits.js";
import { requirePlayer } from "./auth.js";
import { sendError } from "./error-body.js";
import type { SessionService } from "./service.js";

const CHANGES_PER_PLAYER_PER_MINUTE = 10;
const CHANGES_PER_ADDRESS_PER_MINUTE = 120;
const DOWNLOADS_PER_ADDRESS_PER_MINUTE = 3000;

const changeErrors = {
  400: ApiErrorSchema,
  401: ApiErrorSchema,
  409: ApiErrorSchema,
  429: ApiErrorSchema,
};

const avatarChangeRoutes =
  (sessions: SessionService): FastifyPluginAsyncTypebox =>
  async (app) => {
    const playerOf = requirePlayer(app, sessions, CHANGES_PER_ADDRESS_PER_MINUTE);
    const perPlayer = perMinute(CHANGES_PER_PLAYER_PER_MINUTE, byClientAndParam("playerId"));

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
        if (!Buffer.isBuffer(request.body)) return sendError(reply, "unsupported_media_type");
        const result = await sessions.setAvatar(playerOf(request), request.body);
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
        const result = await sessions.removeAvatar(playerOf(request));
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
        const result = await sessions.setCharacter(playerOf(request), request.body);
        if (result.ok) return reply.code(204).send(null);
        return sendError(reply, result.error);
      },
    );
  };

export const avatarRoutes =
  (sessions: SessionService): FastifyPluginAsyncTypebox =>
  async (app) => {
    app.addContentTypeParser(
      AVATAR_CONTENT_TYPES,
      { parseAs: "buffer", bodyLimit: AVATAR_MAX_BYTES },
      (_request, body, done) => done(null, body),
    );

    app.register(avatarChangeRoutes(sessions));

    app.get(
      "/api/sessions/:sessionId/players/:playerId/avatar",
      {
        config: perMinute(DOWNLOADS_PER_ADDRESS_PER_MINUTE, byClient),
        schema: { params: PlayerParamsSchema },
      },
      async (request, reply) => {
        const avatar = await sessions.getAvatar(request.params.sessionId, request.params.playerId);
        if (!avatar) return sendError(reply, "not_found");
        return reply
          .header("content-type", avatar.type)
          .header("cache-control", "no-store")
          .header("x-content-type-options", "nosniff")
          .header("content-security-policy", "default-src 'none'; sandbox")
          .send(avatar.bytes);
      },
    );
  };
