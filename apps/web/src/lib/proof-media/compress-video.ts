import { ProofMediaCanceledError, ProofMediaError } from "./errors";
import type { CompressedVideo, CompressionCallbacks, VideoJob, VideoWorkerMessage, VideoWorkerRequest } from "./types";

export type CompressionTask<Result> = {
  result: Promise<Result>;
  cancel: () => void;
};

export const compressVideo = (
  file: File,
  job: VideoJob,
  { onProgress, onSource }: CompressionCallbacks,
): CompressionTask<CompressedVideo> => {
  const worker = new Worker(new URL("./video.worker.ts", import.meta.url), { type: "module" });
  const send = (request: VideoWorkerRequest) => worker.postMessage(request);
  let rejectResult: (error: Error) => void = () => {};

  const result = new Promise<CompressedVideo>((resolve, reject) => {
    rejectResult = reject;
    worker.addEventListener("message", (event: MessageEvent<VideoWorkerMessage>) => {
      const message = event.data;
      if (message.type === "progress") onProgress(message.progress);
      else if (message.type === "source") onSource?.(message.source);
      else if (message.type === "done") resolve(message.video);
      else if (message.type === "failed") reject(new ProofMediaError(message.code));
      else reject(new ProofMediaCanceledError());
    });
    worker.addEventListener("error", () => reject(new ProofMediaError("failed")));
  }).finally(() => worker.terminate());

  send({ type: "start", file, job });

  return {
    result,
    cancel: () => {
      send({ type: "cancel" });
      rejectResult(new ProofMediaCanceledError());
    },
  };
};
