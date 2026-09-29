import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  type ErrorCode,
  QUESTION_IMAGE_CONTENT_TYPES,
  QUESTION_IMAGE_MAX_BYTES,
  type QuestionImageContentType,
} from "@gamemash/shared";
import { ApiErrorSchema, BearerAuthHeadersSchema, SessionParamsSchema } from "@gamemash/shared/schemas";
import { Type } from "typebox";
import { requireHost, sessionRateLimitKey } from "./auth.js";
import { errorBody } from "./error-body.js";
import type { SessionService } from "./service.js";

const MINUTE_MS = 60_000;
const UPLOADS_PER_SESSION_PER_MINUTE = 60;
const LISTS_PER_SESSION_PER_MINUTE = 120;
const REQUESTS_PER_ADDRESS_PER_MINUTE = 300;

const IMAGE_ERROR_STATUS: Partial<Record<ErrorCode, 400 | 401 | 409 | 503>> = {
  invalid_image: 400,
  unauthorized: 401,
  setup_locked: 409,
  image_limit_reached: 409,
  images_unavailable: 503,
  image_storage_full: 503,
};

const QuestionImageSchema = Type.Object({ id: Type.String(), url: Type.String() });

const errorResponses = {
  400: ApiErrorSchema,
  401: ApiErrorSchema,
  409: ApiErrorSchema,
  413: ApiErrorSchema,
  415: ApiErrorSchema,
  429: ApiErrorSchema,
  503: ApiErrorSchema,
};

const toContentType = (header: string | undefined) =>
  QUESTION_IMAGE_CONTENT_TYPES.find((type) => type === header?.split(";")[0]?.trim().toLowerCase());

export const imageRoutes =
  (sessions: SessionService): FastifyPluginAsyncTypebox =>
  async (app) => {
    const hostOf = requireHost(app, sessions, REQUESTS_PER_ADDRESS_PER_MINUTE);

    app.addContentTypeParser(
      QUESTION_IMAGE_CONTENT_TYPES,
      { parseAs: "buffer", bodyLimit: QUESTION_IMAGE_MAX_BYTES },
      (_request, body, done) => done(null, body),
    );

    app.put(
      "/api/sessions/:sessionId/images",
      {
        bodyLimit: QUESTION_IMAGE_MAX_BYTES,
        config: {
          rateLimit: { max: UPLOADS_PER_SESSION_PER_MINUTE, timeWindow: MINUTE_MS, keyGenerator: sessionRateLimitKey },
        },
        schema: {
          params: SessionParamsSchema,
          headers: BearerAuthHeadersSchema,
          response: { 200: Type.Object({ imageId: Type.String(), url: Type.String() }), ...errorResponses },
        },
      },
      async (request, reply) => {
        const contentType: QuestionImageContentType | undefined = toContentType(request.headers["content-type"]);
        if (!Buffer.isBuffer(request.body) || !contentType) {
          return reply.code(415).send({ code: "unsupported_media_type" });
        }
        const result = await sessions.uploadImage(hostOf(request), request.body, contentType);
        if (result.ok) return { imageId: result.value.id, url: result.value.url };
        return reply.code(IMAGE_ERROR_STATUS[result.error] ?? 400).send(errorBody(result.error));
      },
    );

    app.get(
      "/api/sessions/:sessionId/images",
      {
        config: {
          rateLimit: { max: LISTS_PER_SESSION_PER_MINUTE, timeWindow: MINUTE_MS, keyGenerator: sessionRateLimitKey },
        },
        schema: {
          params: SessionParamsSchema,
          headers: BearerAuthHeadersSchema,
          response: { 200: Type.Object({ images: Type.Array(QuestionImageSchema) }), ...errorResponses },
        },
      },
      async (request, reply) => {
        const result = await sessions.listImages(hostOf(request));
        if (result.ok) return { images: result.value };
        return reply.code(IMAGE_ERROR_STATUS[result.error] ?? 400).send(errorBody(result.error));
      },
    );
  };
