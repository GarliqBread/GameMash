export const QUESTION_IMAGE_MAX_BYTES = 1024 * 1024;
export const QUESTION_IMAGE_MAX_DIMENSION = 1920;
export type QuestionImageContentType = "image/webp" | "image/jpeg";
export const QUESTION_IMAGE_CONTENT_TYPES: QuestionImageContentType[] = ["image/webp", "image/jpeg"];
export const QUESTION_IMAGES_MAX_PER_SESSION = 150;

export type QuestionImage = {
  id: string;
  url: string;
};

export type UploadImageResponse = {
  imageId: string;
  url: string;
};

export type ImageListResponse = {
  images: QuestionImage[];
};

export type StoredMediaContentType = QuestionImageContentType | "image/gif" | "video/mp4";
export const STORED_MEDIA_CONTENT_TYPES: StoredMediaContentType[] = [
  ...QUESTION_IMAGE_CONTENT_TYPES,
  "image/gif",
  "video/mp4",
];

export const PROOF_PHOTOS_MAX = 2;
export const PROOF_PHOTO_MAX_DIMENSION = 2560;
export const PROOF_PHOTO_MAX_BYTES = 6 * 1024 * 1024;
export const PROOF_GIF_MAX_BYTES = 15 * 1024 * 1024;
export const PROOF_VIDEO_MAX_BYTES = 48 * 1024 * 1024;
export const PROOF_VIDEO_MAX_DURATION_MS = 2 * 60 * 1000;
export const PROOF_VIDEO_MAX_LONG_SIDE = 1280;
export const PROOF_VIDEO_MAX_SHORT_SIDE = 720;
