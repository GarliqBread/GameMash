import { PROOF_GIF_MAX_BYTES, PROOF_PHOTO_MAX_DIMENSION } from "@gamemash/shared";

export const PROOF_PHOTO_MAX_SIDE = PROOF_PHOTO_MAX_DIMENSION;
export const PROOF_GIF_KEEP_MAX_BYTES = PROOF_GIF_MAX_BYTES;
export const PROOF_PHOTO_QUALITIES = [0.85, 0.75, 0.65, 0.55];
export const PROOF_BACKGROUND = "#ffffff";

export const PROOF_VIDEO_MAX_FPS = 30;
export const PROOF_VIDEO_BITRATE = 2_500_000;
export const PROOF_AUDIO_BITRATE = 128_000;
export const PROOF_VIDEO_COPY_MAX_BITRATE = 3_000_000;
export const PROOF_PROGRESS_STEP = 0.01;
export const PROOF_GIF_FRAME_MIN_MS = 20;
export const PROOF_GIF_FRAME_DEFAULT_MS = 100;

export const PROOF_POSTER_MAX_SIDE = 1280;
export const PROOF_POSTER_QUALITY = 0.85;
export const PROOF_POSTER_AT_SECONDS = 1;

export const PROOF_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PROOF_GIF_TYPE = "image/gif";
export const PROOF_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
export const PROOF_ACCEPT = [...PROOF_PHOTO_TYPES, PROOF_GIF_TYPE, ...PROOF_VIDEO_TYPES, ".mov", ".m4v"].join(",");
