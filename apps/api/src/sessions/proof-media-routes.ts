import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  PROOF_GIF_MAX_BYTES,
  PROOF_PHOTO_MAX_BYTES,
  PROOF_VIDEO_MAX_BYTES,
  STORED_MEDIA_CONTENT_TYPES,
  type StoredMediaContentType,
} from "@gamemash/shared";
import { ApiErrorSchema, BearerAuthHeadersSchema, SessionParamsSchema } from "@gamemash/shared/schemas";
import { Type } from "typebox";
import { limitRequestsAtOnce } from "../limits/request-slots.js";
import { perSession } from "../limits/route-limits.js";
import { requireHost } from "./auth.js";
import { sendError } from "./error-body.js";
import type { SessionService } from "./service.js";

const UPLOADS_PER_SESSION_PER_MINUTE = 30;
const REQUESTS_PER_ADDRESS_PER_MINUTE = 120;
const UPLOAD_SLOTS = { max: 4, perClient: 1 };

const MAX_BYTES: Record<StoredMediaContentType, number> = {
  "image/webp": PROOF_PHOTO_MAX_BYTES,
  "image/jpeg": PROOF_PHOTO_MAX_BYTES,
  "image/gif": PROOF_GIF_MAX_BYTES,
  "video/mp4": PROOF_VIDEO_MAX_BYTES,
};

const errorResponses = {
  400: ApiErrorSchema,
  401: ApiErrorSchema,
  409: ApiErrorSchema,
  413: ApiErrorSchema,
  415: ApiErrorSchema,
  429: ApiErrorSchema,
  503: ApiErrorSchema,
};

const toContentType = (header: string | undefined): StoredMediaContentType | undefined =>
  STORED_MEDIA_CONTENT_TYPES.find((type) => type === header?.split(";")[0]?.trim().toLowerCase());

export const proofMediaRoutes =
  (sessions: SessionService): FastifyPluginAsyncTypebox =>
  async (app) => {
    const hostOf = requireHost(app, sessions, REQUESTS_PER_ADDRESS_PER_MINUTE);
    app.removeAllContentTypeParsers();
    app.addHook("onRequest", async (request, reply) => {
      const contentType = toContentType(request.headers["content-type"]);
      if (!contentType) return sendError(reply, "unsupported_media_type");
      if (Number(request.headers["content-length"] ?? 0) > MAX_BYTES[contentType]) {
        return sendError(reply, "payload_too_large");
      }
    });
    limitRequestsAtOnce(app, UPLOAD_SLOTS);

    app.addContentTypeParser(
      STORED_MEDIA_CONTENT_TYPES,
      { parseAs: "buffer", bodyLimit: PROOF_VIDEO_MAX_BYTES },
      (_request, body, done) => done(null, body),
    );

    app.put(
      "/api/sessions/:sessionId/proof-media",
      {
        bodyLimit: PROOF_VIDEO_MAX_BYTES,
        config: perSession(UPLOADS_PER_SESSION_PER_MINUTE),
        schema: {
          params: SessionParamsSchema,
          headers: BearerAuthHeadersSchema,
          response: { 200: Type.Object({ imageId: Type.String(), url: Type.String() }), ...errorResponses },
        },
      },
      async (request, reply) => {
        const contentType = toContentType(request.headers["content-type"]);
        if (!Buffer.isBuffer(request.body) || !contentType) return sendError(reply, "unsupported_media_type");
        const result = await sessions.uploadProofMedia(hostOf(request), request.body, contentType);
        if (result.ok) return { imageId: result.value.id, url: result.value.url };
        return sendError(reply, result.error);
      },
    );
  };
