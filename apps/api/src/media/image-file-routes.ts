import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import type { FastifyReply } from "fastify";
import { Type } from "typebox";
import { byClient, perMinute } from "../limits/route-limits.js";
import { sendError } from "../sessions/error-body.js";
import { parseRange } from "./byte-range.js";
import { DISK_IMAGE_PATH } from "./disk-image-store.js";
import { IMAGE_CACHE_CONTROL, IMAGE_PATH_ID, type ImageFileStore, type OpenedImage } from "./image-store.js";

const DOWNLOADS_PER_ADDRESS_PER_MINUTE = 600;
const PARTIAL_CONTENT = 206;
const RANGE_NOT_SATISFIABLE = 416;

const PathIdSchema = Type.String({ pattern: `^${IMAGE_PATH_ID}$` });

const withSafeHeaders = (reply: FastifyReply, image: OpenedImage) =>
  reply
    .header("content-type", image.contentType)
    .header("cache-control", IMAGE_CACHE_CONTROL)
    .header("accept-ranges", "bytes")
    .header("x-content-type-options", "nosniff")
    .header("content-security-policy", "default-src 'none'; sandbox")
    .header("cross-origin-resource-policy", "same-origin");

export const imageFileRoutes =
  (images: ImageFileStore): FastifyPluginAsyncTypebox =>
  async (app) => {
    app.get(
      `${DISK_IMAGE_PATH}/:sessionId/:imageId`,
      {
        config: perMinute(DOWNLOADS_PER_ADDRESS_PER_MINUTE, byClient),
        schema: { params: Type.Object({ sessionId: PathIdSchema, imageId: PathIdSchema }) },
      },
      async (request, reply) => {
        const image = await images.open(request.params.sessionId, request.params.imageId);
        if (!image) return sendError(reply, "not_found");
        const requested = parseRange(request.headers.range, image.size);
        if (requested.kind === "unsatisfiable") {
          return withSafeHeaders(reply, image)
            .code(RANGE_NOT_SATISFIABLE)
            .header("content-range", `bytes */${image.size}`)
            .send();
        }
        if (requested.kind === "full") {
          return withSafeHeaders(reply, image).header("content-length", image.size).send(image.stream());
        }
        const { start, end } = requested.range;
        return withSafeHeaders(reply, image)
          .code(PARTIAL_CONTENT)
          .header("content-range", `bytes ${start}-${end}/${image.size}`)
          .header("content-length", end - start + 1)
          .send(image.stream(requested.range));
      },
    );
  };
