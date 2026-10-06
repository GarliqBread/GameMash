import { randomBytes } from "node:crypto";
import type { Readable } from "node:stream";
import { SESSION_MAX_AGE_SECONDS, STORED_MEDIA_CONTENT_TYPES, type StoredMediaContentType } from "@gamemash/shared";

export const PRESIGNED_URL_TTL_SECONDS = 60 * 60;
export const IMAGE_CACHE_CONTROL = `private, max-age=${SESSION_MAX_AGE_SECONDS}, immutable`;

const IMAGE_ID_BYTES = 16;

export const IMAGE_PATH_ID = "[A-Za-z0-9_-]{1,64}";

const SAFE_IMAGE_PATH_ID = new RegExp(`^${IMAGE_PATH_ID}$`);

export const isSafeImagePathId = (value: string) => SAFE_IMAGE_PATH_ID.test(value);

export const IMAGE_EXTENSIONS: Record<StoredMediaContentType, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "video/mp4": "mp4",
};

export const contentTypeForExtension = (extension: string) =>
  STORED_MEDIA_CONTENT_TYPES.find((contentType) => IMAGE_EXTENSIONS[contentType] === extension);

export type ImageStore = {
  put: (sessionId: string, imageId: string, bytes: Buffer, contentType: StoredMediaContentType) => Promise<void>;
  get: (sessionId: string, imageId: string) => Promise<StoredImage | null>;
  presignedUrl: (sessionId: string, imageId: string) => Promise<string>;
  deleteImages: (sessionId: string, imageIds: string[]) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  listSessionIds: () => Promise<string[]>;
  hasRoom: () => Promise<boolean>;
};

export type StoredImage = {
  bytes: Buffer;
  contentType: StoredMediaContentType;
};

export type ByteRange = { start: number; end: number };

export type OpenedImage = {
  contentType: StoredMediaContentType;
  size: number;
  stream: (range?: ByteRange) => Readable;
};

export type ImageFileStore = ImageStore & {
  open: (sessionId: string, imageId: string) => Promise<OpenedImage | null>;
};

export const IMAGE_SESSIONS_PREFIX = "sessions/";

export const createImageId = () => randomBytes(IMAGE_ID_BYTES).toString("base64url");

export const sessionImagesPrefix = (sessionId: string) => `${IMAGE_SESSIONS_PREFIX}${sessionId}/`;

export const imageKey = (sessionId: string, imageId: string) => `${sessionImagesPrefix(sessionId)}images/${imageId}`;
