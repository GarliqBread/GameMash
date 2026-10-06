import type { StoredMediaContentType } from "@gamemash/shared";

export type MediaRole = "questionImage" | "proofPhoto" | "proofVideo" | "proofPoster";

export type MediaRef = { id: string; role: MediaRole };

export const MEDIA_ROLE_TYPES: Record<MediaRole, StoredMediaContentType[]> = {
  questionImage: ["image/webp", "image/jpeg"],
  proofPhoto: ["image/webp", "image/jpeg", "image/gif"],
  proofVideo: ["video/mp4"],
  proofPoster: ["image/webp", "image/jpeg"],
};
