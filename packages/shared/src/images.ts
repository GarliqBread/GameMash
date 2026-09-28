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
