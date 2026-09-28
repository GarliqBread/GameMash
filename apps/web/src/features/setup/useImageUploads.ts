import type { ApiError, ImageListResponse, QuestionImage } from "@gamemash/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { HostCredentials } from "../../lib/credentials";
import { toApiError } from "../../lib/errors";
import { ImageTooLargeError } from "../../lib/image-encoding";
import { uploadImage } from "../../lib/images";
import { resizeQuestionImage } from "../../lib/question-image";
import { sessionImagesKey } from "../quiz/useQuestionImages";

class UploadError extends Error {
  constructor(public error: ApiError) {
    super(error.code);
  }
}

const resize = async (file: File) => {
  try {
    return await resizeQuestionImage(file);
  } catch (caught) {
    throw new UploadError({ code: caught instanceof ImageTooLargeError ? "payload_too_large" : "invalid_image" });
  }
};

const toUploadError = (caught: unknown) => (caught instanceof UploadError ? caught.error : toApiError(caught));

export const useImageUploads = (credentials: HostCredentials) => {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, ApiError | null>>({});

  const adjustPending = (questionId: string, delta: number) =>
    setPending((current) => ({ ...current, [questionId]: (current[questionId] ?? 0) + delta }));
  const setError = (questionId: string, error: ApiError | null) =>
    setErrors((current) => ({ ...current, [questionId]: error }));

  const remember = async (image: QuestionImage) => {
    const key = sessionImagesKey(credentials.sessionId);
    if (!queryClient.getQueryData(key)) return queryClient.invalidateQueries({ queryKey: key });
    await queryClient.cancelQueries({ queryKey: key });
    queryClient.setQueryData<ImageListResponse>(key, (current) => ({ images: [...(current?.images ?? []), image] }));
  };

  const uploadOne = async (file: File) => {
    const { imageId, url } = await uploadImage(credentials, await resize(file));
    await remember({ id: imageId, url });
    return imageId;
  };

  const upload = async (questionId: string, files: File[], onUploaded: (imageId: string) => void) => {
    setError(questionId, null);
    adjustPending(questionId, files.length);
    for (const file of files) {
      try {
        onUploaded(await uploadOne(file));
      } catch (caught) {
        setError(questionId, toUploadError(caught));
      } finally {
        adjustPending(questionId, -1);
      }
    }
  };

  return {
    upload,
    pendingCount: (questionId: string) => pending[questionId] ?? 0,
    error: (questionId: string) => errors[questionId] ?? null,
  };
};

export type ImageUploads = ReturnType<typeof useImageUploads>;
