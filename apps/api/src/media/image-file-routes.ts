import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type } from "typebox";
import { byClient, perMinute } from "../limits/route-limits.js";
import { sendError } from "../sessions/error-body.js";
import { DISK_IMAGE_PATH } from "./disk-image-store.js";
import { IMAGE_CACHE_CONTROL, IMAGE_PATH_ID, type ImageStore } from "./image-store.js";

const DOWNLOADS_PER_ADDRESS_PER_MINUTE = 600;

const PathIdSchema = Type.String({ pattern: `^${IMAGE_PATH_ID}$` });

export const imageFileRoutes =
  (images: ImageStore): FastifyPluginAsyncTypebox =>
  async (app) => {
    app.get(
      `${DISK_IMAGE_PATH}/:sessionId/:imageId`,
      {
        config: perMinute(DOWNLOADS_PER_ADDRESS_PER_MINUTE, byClient),
        schema: { params: Type.Object({ sessionId: PathIdSchema, imageId: PathIdSchema }) },
      },
      async (request, reply) => {
        const image = await images.get(request.params.sessionId, request.params.imageId);
        if (!image) return sendError(reply, "not_found");
        return reply
          .header("content-type", image.contentType)
          .header("cache-control", IMAGE_CACHE_CONTROL)
          .header("x-content-type-options", "nosniff")
          .header("content-security-policy", "default-src 'none'; sandbox")
          .header("cross-origin-resource-policy", "same-origin")
          .send(image.bytes);
      },
    );
  };
