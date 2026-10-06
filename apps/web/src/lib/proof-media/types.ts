import type { ProofMediaErrorCode } from "./errors";

export type CompressedPhoto = {
  kind: "image";
  file: Blob;
  width: number;
  height: number;
  sourceBytes: number;
};

export type CompressedVideo = {
  kind: "video";
  file: Blob;
  poster: Blob;
  width: number;
  height: number;
  durationMs: number;
  hasAudio: boolean;
  loop: boolean;
  sourceBytes: number;
  reencoded: boolean;
};

export type CompressedProof = CompressedPhoto | CompressedVideo;

export type VideoJob = "video" | "gif";

export type VideoSourceInfo = { durationMs: number; width: number; height: number };

export type CompressionCallbacks = {
  onProgress: (progress: number) => void;
  onSource?: ((source: VideoSourceInfo) => void) | undefined;
};

export type VideoWorkerRequest = { type: "start"; file: File; job: VideoJob } | { type: "cancel" };

export type VideoWorkerMessage =
  | { type: "progress"; progress: number }
  | { type: "source"; source: VideoSourceInfo }
  | { type: "done"; video: CompressedVideo }
  | { type: "failed"; code: ProofMediaErrorCode }
  | { type: "canceled" };
