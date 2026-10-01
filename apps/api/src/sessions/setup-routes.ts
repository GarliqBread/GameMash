import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { SETUP_FILE_FORMAT } from "@gamemash/games/config";
import { HostSetupResponseSchema, SessionSetupSchema, SetupImportResponseSchema } from "@gamemash/games/schemas";
import {
  type ErrorCode,
  SETUP_FILE_CONTENT_TYPE,
  SETUP_FILE_EXTENSION,
  SETUP_IMPORT_MAX_BYTES,
} from "@gamemash/shared";
import { ApiErrorSchema, BearerAuthHeadersSchema, SessionParamsSchema } from "@gamemash/shared/schemas";
import { Type } from "typebox";
import { createConcurrencyLimit } from "../limits/concurrency-limit.js";
import { perSession } from "../limits/route-limits.js";
import { BYTES_PER_MB } from "../units.js";
import { requireHost } from "./auth.js";
import { errorBody } from "./error-body.js";
import type { SessionService } from "./service.js";

const SETUP_MAX_BYTES = 2 * BYTES_PER_MB;
const READS_PER_MINUTE = 120;
const SAVES_PER_SESSION_PER_MINUTE = 300;
const REQUESTS_PER_ADDRESS_PER_MINUTE = 600;
const EXPORTS_PER_SESSION_PER_MINUTE = 20;
const IMPORTS_PER_SESSION_PER_MINUTE = 10;
const TRANSFERS_AT_ONCE = 2;

const SETUP_ERROR_STATUS: Partial<Record<ErrorCode, 400 | 401 | 409>> = {
  bad_request: 400,
  unauthorized: 401,
  setup_locked: 409,
};

const IMPORT_ERROR_STATUS: Partial<Record<ErrorCode, 400 | 401 | 409 | 413 | 503>> = {
  ...SETUP_ERROR_STATUS,
  invalid_image: 400,
  import_invalid: 400,
  import_too_many_games: 409,
  image_limit_reached: 409,
  export_too_large: 413,
  images_unavailable: 503,
  image_storage_full: 503,
};

export const setupRoutes =
  (sessions: SessionService): FastifyPluginAsyncTypebox =>
  async (app) => {
    const hostOf = requireHost(app, sessions, REQUESTS_PER_ADDRESS_PER_MINUTE);
    const transfers = createConcurrencyLimit(TRANSFERS_AT_ONCE);

    app.addContentTypeParser(
      SETUP_FILE_CONTENT_TYPE,
      { parseAs: "buffer", bodyLimit: SETUP_IMPORT_MAX_BYTES },
      (_request, body, done) => done(null, body),
    );

    app.get(
      "/api/sessions/:sessionId/setup",
      {
        config: perSession(READS_PER_MINUTE),
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
        config: perSession(SAVES_PER_SESSION_PER_MINUTE),
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
        return reply.code(SETUP_ERROR_STATUS[result.error] ?? 400).send(errorBody(result.error));
      },
    );

    app.get(
      "/api/sessions/:sessionId/setup/export",
      {
        config: perSession(EXPORTS_PER_SESSION_PER_MINUTE),
        schema: { params: SessionParamsSchema, headers: BearerAuthHeadersSchema },
      },
      async (request, reply) => {
        const slot = await transfers.run(() => sessions.exportSetup(hostOf(request)));
        if (!slot.ok) return reply.code(429).send(errorBody("rate_limited"));
        const result = slot.value;
        if (!result.ok) return reply.code(IMPORT_ERROR_STATUS[result.error] ?? 400).send(errorBody(result.error));
        return reply
          .header("content-type", SETUP_FILE_CONTENT_TYPE)
          .header("content-disposition", `attachment; filename="${SETUP_FILE_FORMAT}.${SETUP_FILE_EXTENSION}"`)
          .header("cache-control", "no-store")
          .header("x-content-type-options", "nosniff")
          .send(result.value);
      },
    );

    app.post(
      "/api/sessions/:sessionId/setup/import",
      {
        bodyLimit: SETUP_IMPORT_MAX_BYTES,
        config: perSession(IMPORTS_PER_SESSION_PER_MINUTE),
        schema: {
          params: SessionParamsSchema,
          headers: BearerAuthHeadersSchema,
          response: {
            200: SetupImportResponseSchema,
            400: ApiErrorSchema,
            401: ApiErrorSchema,
            409: ApiErrorSchema,
            413: ApiErrorSchema,
            415: ApiErrorSchema,
            429: ApiErrorSchema,
            503: ApiErrorSchema,
          },
        },
      },
      async (request, reply) => {
        if (!Buffer.isBuffer(request.body)) return reply.code(415).send(errorBody("unsupported_media_type"));
        const body = request.body;
        const slot = await transfers.run(() => sessions.importSetup(hostOf(request), body));
        if (!slot.ok) return reply.code(429).send(errorBody("rate_limited"));
        const result = slot.value;
        if (result.ok) return result.value;
        return reply.code(IMPORT_ERROR_STATUS[result.error] ?? 400).send(errorBody(result.error));
      },
    );
  };
