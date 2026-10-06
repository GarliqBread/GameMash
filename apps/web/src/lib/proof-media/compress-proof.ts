import { compressPhoto, keepGif } from "./compress-photo";
import { type CompressionTask, compressVideo } from "./compress-video";
import { ProofMediaCanceledError, ProofMediaError } from "./errors";
import { PROOF_GIF_KEEP_MAX_BYTES, PROOF_GIF_TYPE, PROOF_PHOTO_TYPES, PROOF_VIDEO_TYPES } from "./limits";
import type { CompressedProof, CompressionCallbacks } from "./types";

export type ProofFileKind = "photo" | "gif" | "video";

const VIDEO_EXTENSIONS = [".mp4", ".m4v", ".mov", ".webm"];

export const proofFileKind = (file: File): ProofFileKind | null => {
  if (PROOF_PHOTO_TYPES.includes(file.type)) return "photo";
  if (file.type === PROOF_GIF_TYPE) return "gif";
  if (PROOF_VIDEO_TYPES.includes(file.type)) return "video";
  const name = file.name.toLowerCase();
  if (file.type === "" && VIDEO_EXTENSIONS.some((extension) => name.endsWith(extension))) return "video";
  return null;
};

const cancelable = <Result>(work: Promise<Result>): CompressionTask<Result> => {
  let rejectResult: (error: Error) => void = () => {};
  const canceled = new Promise<never>((_, reject) => {
    rejectResult = reject;
  });
  return { result: Promise.race([work, canceled]), cancel: () => rejectResult(new ProofMediaCanceledError()) };
};

const gifTask = (file: File, callbacks: CompressionCallbacks): CompressionTask<CompressedProof> => {
  if (file.size > PROOF_GIF_KEEP_MAX_BYTES) return compressVideo(file, "gif", callbacks);
  let isCanceled = false;
  let videoTask: CompressionTask<CompressedProof> | null = null;
  const task = cancelable(
    keepGif(file).then((kept) => {
      if (kept) return kept;
      if (isCanceled) throw new ProofMediaCanceledError();
      videoTask = compressVideo(file, "gif", callbacks);
      return videoTask.result;
    }),
  );
  return {
    result: task.result,
    cancel: () => {
      isCanceled = true;
      videoTask?.cancel();
      task.cancel();
    },
  };
};

export const compressProof = (file: File, callbacks: CompressionCallbacks): CompressionTask<CompressedProof> => {
  const kind = proofFileKind(file);
  if (kind === "video") return compressVideo(file, "video", callbacks);
  if (kind === "gif") return gifTask(file, callbacks);
  if (kind === "photo") return cancelable(compressPhoto(file));
  return { result: Promise.reject(new ProofMediaError("unsupported_type")), cancel: () => {} };
};
