import {
  QUESTION_IMAGE_MAX_BYTES,
  QUESTION_IMAGE_MAX_DIMENSION,
  QUESTION_IMAGES_MAX_PER_SESSION,
  type QuestionImage,
  type QuestionImageContentType,
  SESSION_MAX_AGE_SECONDS,
} from "@gamemash/shared";
import { sessionExpiresAt } from "../sessions/expiry.js";
import { inspectImage } from "../sessions/image.js";
import { fail, type Result } from "../sessions/result.js";
import type { SessionRecord, SessionStore } from "../sessions/store.js";
import { createImageId, type ImageStore } from "./image-store.js";

export const DEFAULT_MAX_ACTIVE_IMAGES = 3000;
const LEASE_GRACE_MS = 30 * 60 * 1000;
const UNUSED_IMAGE_GRACE_MS = 10 * 60 * 1000;

const ADD_IMAGE_ERRORS = {
  limit_reached: "image_limit_reached",
  storage_full: "image_storage_full",
  setup_locked: "setup_locked",
  session_not_found: "unauthorized",
} as const;

export type ImageServiceDeps = {
  store: SessionStore;
  images?: ImageStore | undefined;
  now: () => number;
  maxActiveImages?: number | undefined;
};

const isAllowedImage = (bytes: Buffer, contentType: QuestionImageContentType) => {
  const image = bytes.length <= QUESTION_IMAGE_MAX_BYTES ? inspectImage(bytes) : null;
  return (
    image !== null &&
    image.type === contentType &&
    image.width > 0 &&
    image.height > 0 &&
    image.width <= QUESTION_IMAGE_MAX_DIMENSION &&
    image.height <= QUESTION_IMAGE_MAX_DIMENSION
  );
};

export const createImageService = ({
  store,
  images,
  now,
  maxActiveImages = DEFAULT_MAX_ACTIVE_IMAGES,
}: ImageServiceDeps) => {
  const urlsFor = (imageStore: ImageStore, sessionId: string, ids: string[]) =>
    Promise.all(
      ids.map(async (id): Promise<QuestionImage> => ({ id, url: await imageStore.presignedUrl(sessionId, id) })),
    );

  const uploadImage = async (
    session: SessionRecord,
    bytes: Buffer,
    contentType: QuestionImageContentType,
  ): Promise<Result<QuestionImage>> => {
    if (!images) return fail("images_unavailable");
    if (!isAllowedImage(bytes, contentType)) return fail("invalid_image");
    if (!(await images.hasRoom())) return fail("image_storage_full");
    const id = createImageId();
    const expiresAt = sessionExpiresAt(session.createdAt, now());
    const added = await store.addImage(session.id, id, {
      maxPerSession: QUESTION_IMAGES_MAX_PER_SESSION,
      maxActive: maxActiveImages,
      expiresAt,
      leaseUntil: session.createdAt + SESSION_MAX_AGE_SECONDS * 1000 + LEASE_GRACE_MS,
      uploadedAt: now(),
    });
    if (added !== "added") return fail(ADD_IMAGE_ERRORS[added]);
    try {
      await images.put(session.id, id, bytes, contentType);
    } catch (error) {
      await store.removeImages(session.id, [id]);
      throw error;
    } finally {
      await store.touch(session, expiresAt);
    }
    return { ok: true, value: { id, url: await images.presignedUrl(session.id, id) } };
  };

  const listImages = async (session: SessionRecord): Promise<Result<QuestionImage[]>> => {
    if (!images) return fail("images_unavailable");
    const ids = (await store.listImages(session.id)).map((image) => image.id);
    return { ok: true, value: await urlsFor(images, session.id, ids) };
  };

  const hasImages = async (sessionId: string, ids: string[]) => {
    if (ids.length === 0) return true;
    if (!images) return false;
    const owned = new Set((await store.listImages(sessionId)).map((image) => image.id));
    return ids.every((id) => owned.has(id));
  };

  const pruneImages = async (sessionId: string, usedIds: string[]) => {
    if (!images) return;
    const used = new Set(usedIds);
    const cutoff = now() - UNUSED_IMAGE_GRACE_MS;
    const unused = (await store.listImages(sessionId))
      .filter((image) => !used.has(image.id) && image.uploadedAt <= cutoff)
      .map((image) => image.id);
    if (unused.length === 0) return;
    await store.removeImages(sessionId, unused);
    await images.deleteImages(sessionId, unused);
  };

  const deleteImages = async (sessionId: string) => {
    if (!images) return;
    await store.releaseImages(sessionId);
    await images.deleteSession(sessionId);
  };

  const sweepImages = async () => {
    if (!images) return 0;
    const sessionIds = await images.listSessionIds();
    const ended = (
      await Promise.all(sessionIds.map(async (id) => ((await store.findById(id)) === null ? [id] : [])))
    ).flat();
    await Promise.all(ended.map((id) => deleteImages(id)));
    return ended.length;
  };

  return {
    imagesEnabled: images !== undefined,
    uploadImage,
    listImages,
    hasImages,
    pruneImages,
    deleteImages,
    sweepImages,
  };
};
