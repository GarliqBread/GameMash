import { MEDIA_ROLE_TYPES, type MediaRef } from "@gamemash/games/config";
import {
  MS_PER_MINUTE,
  PROOF_GIF_MAX_BYTES,
  PROOF_PHOTO_MAX_BYTES,
  PROOF_PHOTO_MAX_DIMENSION,
  PROOF_VIDEO_MAX_BYTES,
  QUESTION_IMAGE_MAX_BYTES,
  QUESTION_IMAGE_MAX_DIMENSION,
  QUESTION_IMAGES_MAX_PER_SESSION,
  type QuestionImage,
  type StoredMediaContentType,
} from "@gamemash/shared";
import { sessionDeadline, sessionExpiresAt } from "../sessions/expiry.js";
import { inspectImage } from "../sessions/image.js";
import { fail, type Result } from "../sessions/result.js";
import type { SessionRecord, SessionStore } from "../sessions/store.js";
import { createImageId, type ImageStore } from "./image-store.js";
import { inspectVideo } from "./video.js";

const DEFAULT_MAX_ACTIVE_IMAGES = 3000;
const LEASE_GRACE_MS = 30 * MS_PER_MINUTE;
const UNUSED_IMAGE_GRACE_MS = 10 * MS_PER_MINUTE;

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

type ImageLimits = { maxBytes: number; maxDimension: number };

const QUESTION_IMAGE_LIMITS: ImageLimits = {
  maxBytes: QUESTION_IMAGE_MAX_BYTES,
  maxDimension: QUESTION_IMAGE_MAX_DIMENSION,
};

const PROOF_IMAGE_LIMITS: Record<Exclude<StoredMediaContentType, "video/mp4">, ImageLimits> = {
  "image/webp": { maxBytes: PROOF_PHOTO_MAX_BYTES, maxDimension: PROOF_PHOTO_MAX_DIMENSION },
  "image/jpeg": { maxBytes: PROOF_PHOTO_MAX_BYTES, maxDimension: PROOF_PHOTO_MAX_DIMENSION },
  "image/gif": { maxBytes: PROOF_GIF_MAX_BYTES, maxDimension: PROOF_PHOTO_MAX_DIMENSION },
};

const isWithin = (bytes: Buffer, contentType: StoredMediaContentType, { maxBytes, maxDimension }: ImageLimits) => {
  const image = bytes.length <= maxBytes ? inspectImage(bytes) : null;
  return (
    image !== null &&
    image.type === contentType &&
    image.width > 0 &&
    image.height > 0 &&
    image.width <= maxDimension &&
    image.height <= maxDimension
  );
};

const isAllowedQuestionImage = async (bytes: Buffer, contentType: StoredMediaContentType) =>
  contentType !== "image/gif" && contentType !== "video/mp4" && isWithin(bytes, contentType, QUESTION_IMAGE_LIMITS);

const isAllowedProofMedia = async (bytes: Buffer, contentType: StoredMediaContentType) => {
  if (contentType !== "video/mp4") return isWithin(bytes, contentType, PROOF_IMAGE_LIMITS[contentType]);
  return bytes.length <= PROOF_VIDEO_MAX_BYTES && (await inspectVideo(bytes)) !== null;
};

type UploadOptions = { checkRoom: boolean };

const ALWAYS_CHECK_ROOM: UploadOptions = { checkRoom: true };

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

  const storeMedia = async (
    session: SessionRecord,
    bytes: Buffer,
    contentType: StoredMediaContentType,
    isAllowed: (bytes: Buffer, contentType: StoredMediaContentType) => Promise<boolean>,
    { checkRoom }: UploadOptions,
  ): Promise<Result<QuestionImage>> => {
    if (!images) return fail("images_unavailable");
    if (!(await isAllowed(bytes, contentType))) return fail("invalid_image");
    if (checkRoom && !(await images.hasRoom())) return fail("image_storage_full");
    const id = createImageId();
    const expiresAt = sessionExpiresAt(session.createdAt, now());
    const added = await store.addImage(session.id, id, {
      contentType,
      maxPerSession: QUESTION_IMAGES_MAX_PER_SESSION,
      maxActive: maxActiveImages,
      expiresAt,
      leaseUntil: sessionDeadline(session.createdAt) + LEASE_GRACE_MS,
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

  const uploadImage = (
    session: SessionRecord,
    bytes: Buffer,
    contentType: StoredMediaContentType,
    options: UploadOptions = ALWAYS_CHECK_ROOM,
  ) => storeMedia(session, bytes, contentType, isAllowedQuestionImage, options);

  const uploadProofMedia = (
    session: SessionRecord,
    bytes: Buffer,
    contentType: StoredMediaContentType,
    options: UploadOptions = ALWAYS_CHECK_ROOM,
  ) => storeMedia(session, bytes, contentType, isAllowedProofMedia, options);

  const listImages = async (session: SessionRecord): Promise<Result<QuestionImage[]>> => {
    if (!images) return fail("images_unavailable");
    const ids = (await store.listImages(session.id)).map((image) => image.id);
    return { ok: true, value: await urlsFor(images, session.id, ids) };
  };

  const hasMedia = async (sessionId: string, refs: MediaRef[]) => {
    if (refs.length === 0) return true;
    if (!images) return false;
    const owned = new Map((await store.listImages(sessionId)).map((image) => [image.id, image.contentType]));
    return refs.every((ref) => {
      if (!owned.has(ref.id)) return false;
      const contentType = owned.get(ref.id) ?? null;
      return contentType === null ? ref.role === "questionImage" : MEDIA_ROLE_TYPES[ref.role].includes(contentType);
    });
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

  const hasImageRoom = async () => (images ? images.hasRoom() : false);

  const readImage = async (sessionId: string, imageId: string) => (images ? images.get(sessionId, imageId) : null);

  const discardImages = async (sessionId: string, imageIds: string[]) => {
    if (!images || imageIds.length === 0) return;
    await store.removeImages(sessionId, imageIds);
    await images.deleteImages(sessionId, imageIds);
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
    uploadProofMedia,
    listImages,
    hasMedia,
    pruneImages,
    readImage,
    hasImageRoom,
    discardImages,
    deleteImages,
    sweepImages,
  };
};
