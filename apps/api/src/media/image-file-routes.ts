import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type } from "typebox";
import { clientKey } from "../limits/client-key.js";
import { DISK_IMAGE_PATH, type DiskImageStore } from "./disk-image-store.js";
import { IMAGE_CACHE_CONTROL } from "./image-store.js";

const MINUTE_MS = 60_000;
const DOWNLOADS_PER_ADDRESS_PER_MINUTE = 600;

const PathIdSchema = Type.String({ minLength: 1, maxLength: 64, pattern: "^[A-Za-z0-9_-]+$" });

export const imageFileRoutes =
  (images: DiskImageStore): FastifyPluginAsyncTypebox =>
  async (app) => {
    app.get(
      `${DISK_IMAGE_PATH}/:sessionId/:imageId`,
      {
        config: {
          rateLimit: {
            max: DOWNLOADS_PER_ADDRESS_PER_MINUTE,
            timeWindow: MINUTE_MS,
            keyGenerator: (request) => clientKey(request.ip),
          },
        },
        schema: { params: Type.Object({ sessionId: PathIdSchema, imageId: PathIdSchema }) },
      },
      async (request, reply) => {
        const image = await images.read(request.params.sessionId, request.params.imageId);
        if (!image) return reply.code(404).send({ code: "not_found" });
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
