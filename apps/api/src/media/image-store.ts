import { randomBytes } from "node:crypto";
import { QUESTION_IMAGE_CONTENT_TYPES, type QuestionImageContentType, SESSION_MAX_AGE_SECONDS } from "@gamemash/shared";

export const PRESIGNED_URL_TTL_SECONDS = 60 * 60;
export const IMAGE_CACHE_CONTROL = `private, max-age=${SESSION_MAX_AGE_SECONDS}, immutable`;

const IMAGE_ID_BYTES = 16;

export const IMAGE_PATH_ID = "[A-Za-z0-9_-]{1,64}";

const SAFE_IMAGE_PATH_ID = new RegExp(`^${IMAGE_PATH_ID}$`);

export const isSafeImagePathId = (value: string) => SAFE_IMAGE_PATH_ID.test(value);

export const IMAGE_EXTENSIONS: Record<QuestionImageContentType, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
};

export const contentTypeForExtension = (extension: string) =>
  QUESTION_IMAGE_CONTENT_TYPES.find((contentType) => IMAGE_EXTENSIONS[contentType] === extension);

export type ImageStore = {
  put: (sessionId: string, imageId: string, bytes: Buffer, contentType: QuestionImageContentType) => Promise<void>;
  get: (sessionId: string, imageId: string) => Promise<StoredImage | null>;
  presignedUrl: (sessionId: string, imageId: string) => Promise<string>;
  deleteImages: (sessionId: string, imageIds: string[]) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  listSessionIds: () => Promise<string[]>;
  hasRoom: () => Promise<boolean>;
};

export type StoredImage = {
  bytes: Buffer;
  contentType: QuestionImageContentType;
};

export const IMAGE_SESSIONS_PREFIX = "sessions/";

export const createImageId = () => randomBytes(IMAGE_ID_BYTES).toString("base64url");

export const sessionImagesPrefix = (sessionId: string) => `${IMAGE_SESSIONS_PREFIX}${sessionId}/`;

export const imageKey = (sessionId: string, imageId: string) => `${sessionImagesPrefix(sessionId)}images/${imageId}`;
