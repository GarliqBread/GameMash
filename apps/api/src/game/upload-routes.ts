import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { DRAW_IT_UPLOAD_MAX_BYTES, type UploadViewer } from "@gamemash/games/config";
import {
  ApiErrorSchema,
  BearerAuthHeadersSchema,
  PlayerParamsSchema,
  SessionParamsSchema,
} from "@gamemash/shared/schemas";
import type { FastifyReply, FastifyRequest } from "fastify";
import { Type } from "typebox";
import { perMinute, routeParam } from "../limits/route-limits.js";
import { requireHost, requirePlayer } from "../sessions/auth.js";
import { sendError } from "../sessions/error-body.js";
import type { SessionService } from "../sessions/service.js";
import type { UploadRead, UploadResult } from "./runner.js";

export type GameUploads = {
  upload: (
    sessionId: string,
    playerId: string,
    phaseId: number,
    body: unknown,
    connected: Set<string>,
  ) => Promise<UploadResult>;
  readUpload: (sessionId: string, viewer: UploadViewer, id: string) => Promise<UploadRead>;
  connectedPlayers: (sessionId: string) => Set<string>;
};

const UPLOAD_MAX_BYTES = DRAW_IT_UPLOAD_MAX_BYTES;
const UPLOADS_PER_PLAYER_PER_MINUTE = 150;
const READS_PER_VIEWER_PER_MINUTE = 600;
const REQUESTS_PER_ADDRESS_PER_MINUTE = 6000;

const UploadIdSchema = Type.String({ minLength: 1, maxLength: 32, pattern: "^[A-Za-z0-9_-]+$" });

const PlayerReadParamsSchema = Type.Object({ ...PlayerParamsSchema.properties, uploadId: UploadIdSchema });

const HostReadParamsSchema = Type.Object({ ...SessionParamsSchema.properties, uploadId: UploadIdSchema });

const UploadBodySchema = Type.Object(
  { phaseId: Type.Integer({ minimum: 1 }), upload: Type.Unknown() },
  { additionalProperties: false },
);

const errorResponses = {
  400: ApiErrorSchema,
  401: ApiErrorSchema,
  404: ApiErrorSchema,
  409: ApiErrorSchema,
  413: ApiErrorSchema,
  429: ApiErrorSchema,
};

const readResponses = {
  204: Type.Null(),
  401: ApiErrorSchema,
  404: ApiErrorSchema,
  429: ApiErrorSchema,
};

const byPlayer = (request: FastifyRequest) => `${routeParam(request, "sessionId")}:${routeParam(request, "playerId")}`;

const byHost = (request: FastifyRequest) => `${routeParam(request, "sessionId")}:host`;

const sendUpload = (reply: FastifyReply, read: UploadRead) => {
  if (read.access === "denied") return sendError(reply, "not_found");
  if (read.payload === null) return reply.code(204).send(null);
  return reply
    .header("content-type", "application/json; charset=utf-8")
    .header("cache-control", "no-store")
    .header("x-content-type-options", "nosniff")
    .send(read.payload);
};

const playerUploadRoutes =
  (sessions: SessionService, uploads: GameUploads): FastifyPluginAsyncTypebox =>
  async (app) => {
    const playerOf = requirePlayer(app, sessions, REQUESTS_PER_ADDRESS_PER_MINUTE);

    app.put(
      "/api/sessions/:sessionId/players/:playerId/game/upload",
      {
        bodyLimit: UPLOAD_MAX_BYTES,
        config: perMinute(UPLOADS_PER_PLAYER_PER_MINUTE, byPlayer),
        schema: {
          params: PlayerParamsSchema,
          headers: BearerAuthHeadersSchema,
          body: UploadBodySchema,
          response: { 204: Type.Null(), ...errorResponses },
        },
      },
      async (request, reply) => {
        const { session, player } = playerOf(request);
        const result = await uploads.upload(
          session.id,
          player.id,
          request.body.phaseId,
          request.body.upload,
          uploads.connectedPlayers(session.id),
        );
        if (result === "accepted") return reply.code(204).send(null);
        if (result === "invalid") return sendError(reply, "bad_request");
        return sendError(reply, "input_closed");
      },
    );

    app.get(
      "/api/sessions/:sessionId/players/:playerId/game/uploads/:uploadId",
      {
        config: perMinute(READS_PER_VIEWER_PER_MINUTE, byPlayer),
        schema: { params: PlayerReadParamsSchema, headers: BearerAuthHeadersSchema, response: readResponses },
      },
      async (request, reply) => {
        const { session, player } = playerOf(request);
        const viewer: UploadViewer = { kind: "player", playerId: player.id };
        return sendUpload(reply, await uploads.readUpload(session.id, viewer, request.params.uploadId));
      },
    );
  };

const hostUploadRoutes =
  (sessions: SessionService, uploads: GameUploads): FastifyPluginAsyncTypebox =>
  async (app) => {
    const hostOf = requireHost(app, sessions, REQUESTS_PER_ADDRESS_PER_MINUTE);

    app.get(
      "/api/sessions/:sessionId/game/uploads/:uploadId",
      {
        config: perMinute(READS_PER_VIEWER_PER_MINUTE, byHost),
        schema: { params: HostReadParamsSchema, headers: BearerAuthHeadersSchema, response: readResponses },
      },
      async (request, reply) => {
        const session = hostOf(request);
        return sendUpload(reply, await uploads.readUpload(session.id, { kind: "host" }, request.params.uploadId));
      },
    );
  };

export const uploadRoutes =
  (sessions: SessionService, uploads: GameUploads): FastifyPluginAsyncTypebox =>
  async (app) => {
    app.register(playerUploadRoutes(sessions, uploads));
    app.register(hostUploadRoutes(sessions, uploads));
  };
