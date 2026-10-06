import { Worker } from "node:worker_threads";

export type VideoInfo = {
  width: number;
  height: number;
  durationMs: number;
};

const INSPECT_TIMEOUT_MS = 5000;
const INSPECT_MAX_HEAP_MB = 256;

const workerUrl = new URL(
  import.meta.url.endsWith(".ts") ? "./video-inspect.worker.ts" : "./video-inspect.worker.js",
  import.meta.url,
);

const isVideoInfo = (value: unknown): value is VideoInfo =>
  typeof value === "object" &&
  value !== null &&
  "width" in value &&
  "height" in value &&
  "durationMs" in value &&
  typeof value.width === "number" &&
  typeof value.height === "number" &&
  typeof value.durationMs === "number";

export const inspectVideo = (bytes: Buffer) =>
  new Promise<VideoInfo | null>((resolve) => {
    const worker = new Worker(workerUrl, {
      workerData: bytes,
      resourceLimits: { maxOldGenerationSizeMb: INSPECT_MAX_HEAP_MB },
      stdout: true,
      stderr: true,
    });
    const finish = (info: VideoInfo | null) => {
      clearTimeout(timer);
      resolve(info);
      void worker.terminate();
    };
    const timer = setTimeout(() => finish(null), INSPECT_TIMEOUT_MS);
    worker.stdout.resume();
    worker.stderr.resume();
    worker.once("message", (message: unknown) => finish(isVideoInfo(message) ? message : null));
    worker.once("error", () => finish(null));
    worker.once("exit", () => finish(null));
  });
