import { PROOF_VIDEO_MAX_BYTES, PROOF_VIDEO_MAX_DURATION_MS } from "@gamemash/shared";
import {
  BlobSource,
  BufferTarget,
  CanvasSink,
  CanvasSource,
  Conversion,
  canEncodeAudio,
  canEncodeVideo,
  type DiscardedTrack,
  Input,
  type InputVideoTrack,
  MP4,
  Mp4OutputFormat,
  Output,
  QTFF,
  WEBM,
} from "mediabunny";
import { ProofMediaCanceledError, ProofMediaError } from "./errors";
import {
  PROOF_AUDIO_BITRATE,
  PROOF_BACKGROUND,
  PROOF_GIF_FRAME_DEFAULT_MS,
  PROOF_GIF_FRAME_MIN_MS,
  PROOF_GIF_TYPE,
  PROOF_POSTER_AT_SECONDS,
  PROOF_POSTER_MAX_SIDE,
  PROOF_POSTER_QUALITY,
  PROOF_PROGRESS_STEP,
  PROOF_VIDEO_BITRATE,
  PROOF_VIDEO_MAX_FPS,
} from "./limits";
import type { CompressedVideo, VideoJob, VideoWorkerMessage, VideoWorkerRequest } from "./types";
import { canKeepVideo, fitWithin, proofVideoSize, type Size } from "./video-plan";

const MS_PER_SECOND = 1000;
const US_PER_MS = 1000;
const MP4_TYPE = "video/mp4";
const VIDEO_FORMATS = [MP4, QTFF, WEBM];

let cancelCurrent: (() => Promise<void>) | null = null;
let isCanceled = false;
let lastProgress = 0;

const post = (message: VideoWorkerMessage) => postMessage(message);

const reportProgress = (progress: number) => {
  if (progress < 1 && progress - lastProgress < PROOF_PROGRESS_STEP) return;
  lastProgress = progress;
  post({ type: "progress", progress });
};

const checkCanceled = () => {
  if (isCanceled) throw new ProofMediaCanceledError();
};

const checkDuration = (durationMs: number) => {
  if (Math.round(durationMs / MS_PER_SECOND) * MS_PER_SECOND > PROOF_VIDEO_MAX_DURATION_MS) {
    throw new ProofMediaError("too_long");
  }
  return Math.min(Math.max(1, Math.round(durationMs)), PROOF_VIDEO_MAX_DURATION_MS);
};

const mp4Output = () =>
  new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });

const outputBlob = (output: Output) => {
  const { buffer } = output.target as BufferTarget;
  if (!buffer) throw new ProofMediaError("unreadable");
  if (buffer.byteLength > PROOF_VIDEO_MAX_BYTES) throw new ProofMediaError("too_large");
  return new Blob([buffer], { type: MP4_TYPE });
};

const ensureAacEncoder = async () => {
  if (await canEncodeAudio("aac", { bitrate: PROOF_AUDIO_BITRATE })) return;
  const { registerAacEncoder } = await import("@mediabunny/aac-encoder");
  registerAacEncoder();
};

const ensureAvcEncoder = async (size: Size) => {
  const isSupported = await canEncodeVideo("avc", { ...size, bitrate: PROOF_VIDEO_BITRATE });
  if (!isSupported) throw new ProofMediaError("unsupported_browser");
};

const encodePoster = async (canvas: OffscreenCanvas | HTMLCanvasElement) => {
  if (!(canvas instanceof OffscreenCanvas)) throw new ProofMediaError("unreadable");
  return canvas.convertToBlob({ type: "image/jpeg", quality: PROOF_POSTER_QUALITY });
};

const posterOf = async (track: InputVideoTrack, size: Size, durationSeconds: number) => {
  const posterSize = fitWithin(size, PROOF_POSTER_MAX_SIDE, PROOF_POSTER_MAX_SIDE);
  const sink = new CanvasSink(track, { ...posterSize, fit: "fill" });
  const wrapped =
    (await sink.getCanvas(Math.min(PROOF_POSTER_AT_SECONDS, durationSeconds / 2))) ?? (await sink.getCanvas(0));
  if (!wrapped) throw new ProofMediaError("unreadable");
  return encodePoster(wrapped.canvas);
};

const isEncoderMissing = (discarded: DiscardedTrack[]) =>
  discarded.some((track) => track.reason === "no_encodable_target_codec");

const readVideo = async (input: Input) => {
  const track = await input.getPrimaryVideoTrack().catch(() => null);
  if (!track || !(await track.canDecode())) throw new ProofMediaError("unreadable");
  const audio = await input.getPrimaryAudioTrack();
  const durationSeconds = await input.computeDuration();
  const durationMs = checkDuration(durationSeconds * MS_PER_SECOND);
  const stats = await track.computePacketStats();
  const source = {
    width: await track.getDisplayWidth(),
    height: await track.getDisplayHeight(),
    videoCodec: await track.getCodec(),
    audioCodec: audio ? await audio.getCodec() : null,
    framesPerSecond: stats.averagePacketRate,
  };
  return { track, audio, durationSeconds, durationMs, source };
};

const compressVideo = async (file: File): Promise<CompressedVideo> => {
  const input = new Input({ source: new BlobSource(file), formats: VIDEO_FORMATS });
  try {
    const { track, audio, durationSeconds, durationMs, source } = await readVideo(input).catch((error: unknown) => {
      throw error instanceof ProofMediaError ? error : new ProofMediaError("unreadable");
    });
    post({ type: "source", source: { durationMs, width: source.width, height: source.height } });
    const bitsPerSecond = (file.size * 8) / Math.max(durationSeconds, 1);
    const keep = canKeepVideo({ ...source, bitsPerSecond });
    const size = keep ? { width: source.width, height: source.height } : proofVideoSize(source);
    checkCanceled();
    if (!keep) await ensureAvcEncoder(size);
    if (audio && !keep) await ensureAacEncoder();

    const output = mp4Output();
    const conversion = await Conversion.init({
      input,
      output,
      tracks: "primary",
      video: keep
        ? { codec: "avc" }
        : {
            codec: "avc",
            ...size,
            fit: "fill",
            bitrate: PROOF_VIDEO_BITRATE,
            forceTranscode: true,
            ...(source.framesPerSecond > PROOF_VIDEO_MAX_FPS ? { frameRate: PROOF_VIDEO_MAX_FPS } : {}),
          },
      audio: keep ? { codec: "aac" } : { codec: "aac", bitrate: PROOF_AUDIO_BITRATE },
    });
    const videoDiscarded = conversion.discardedTracks.filter((discarded) => discarded.track.type === "video");
    if (!conversion.isValid || videoDiscarded.length > 0) {
      throw new ProofMediaError(isEncoderMissing(videoDiscarded) ? "unsupported_browser" : "unreadable");
    }
    conversion.onProgress = reportProgress;
    cancelCurrent = () => conversion.cancel();
    checkCanceled();
    await conversion.execute();
    checkCanceled();

    return {
      kind: "video",
      file: outputBlob(output),
      poster: await posterOf(track, size, durationSeconds),
      ...size,
      durationMs,
      hasAudio: audio !== null && conversion.utilizedTracks.some((used) => used.type === "audio"),
      loop: false,
      sourceBytes: file.size,
      reencoded: !keep,
    };
  } finally {
    input.dispose();
  }
};

const frameDurationMs = (frame: VideoFrame) => {
  const ms = (frame.duration ?? 0) / US_PER_MS;
  return ms < PROOF_GIF_FRAME_MIN_MS ? PROOF_GIF_FRAME_DEFAULT_MS : ms;
};

const openGif = async (file: File) => {
  if (typeof ImageDecoder === "undefined" || !(await ImageDecoder.isTypeSupported(PROOF_GIF_TYPE))) {
    throw new ProofMediaError("unsupported_browser");
  }
  const decoder = new ImageDecoder({ data: file.stream(), type: PROOF_GIF_TYPE });
  try {
    await decoder.completed;
    const track = decoder.tracks.selectedTrack;
    if (!track || track.frameCount === 0) throw new ProofMediaError("unreadable");
    return { decoder, frameCount: track.frameCount };
  } catch (error) {
    decoder.close();
    throw error instanceof ProofMediaError ? error : new ProofMediaError("unreadable");
  }
};

const readGifFrames = async (decoder: ImageDecoder, frameCount: number) => {
  const durations: number[] = [];
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    const { image } = await decoder.decode({ frameIndex });
    durations.push(frameDurationMs(image));
    image.close();
  }
  return durations;
};

const drawGifFrame = async (decoder: ImageDecoder, frameIndex: number, context: OffscreenCanvasRenderingContext2D) => {
  const { image } = await decoder.decode({ frameIndex });
  try {
    context.fillStyle = PROOF_BACKGROUND;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    context.drawImage(image, 0, 0, context.canvas.width, context.canvas.height);
  } finally {
    image.close();
  }
};

const gifSize = async (decoder: ImageDecoder) => {
  const { image } = await decoder.decode({ frameIndex: 0 });
  const size = { width: image.displayWidth, height: image.displayHeight };
  image.close();
  return proofVideoSize(size);
};

const encodeGif = async (decoder: ImageDecoder, durations: number[], size: Size) => {
  const canvas = new OffscreenCanvas(size.width, size.height);
  const context = canvas.getContext("2d");
  if (!context) throw new ProofMediaError("unsupported_browser");
  const output = mp4Output();
  const source = new CanvasSource(canvas, { codec: "avc", bitrate: PROOF_VIDEO_BITRATE });
  output.addVideoTrack(source);
  cancelCurrent = () => output.cancel();
  await output.start();
  const totalMs = durations.reduce((sum, ms) => sum + ms, 0);
  let elapsedMs = 0;
  for (const [frameIndex, ms] of durations.entries()) {
    checkCanceled();
    await drawGifFrame(decoder, frameIndex, context);
    await source.add(elapsedMs / MS_PER_SECOND, ms / MS_PER_SECOND);
    elapsedMs += ms;
    reportProgress(elapsedMs / totalMs);
  }
  await output.finalize();
  return { output, canvas };
};

const compressGif = async (file: File): Promise<CompressedVideo> => {
  const { decoder, frameCount } = await openGif(file);
  try {
    const durations = await readGifFrames(decoder, frameCount);
    const durationMs = checkDuration(durations.reduce((sum, ms) => sum + ms, 0));
    const size = await gifSize(decoder);
    await ensureAvcEncoder(size);
    const { output, canvas } = await encodeGif(decoder, durations, size);
    checkCanceled();
    await drawGifFrame(decoder, 0, canvas.getContext("2d") as OffscreenCanvasRenderingContext2D);
    return {
      kind: "video",
      file: outputBlob(output),
      poster: await encodePoster(canvas),
      ...size,
      durationMs,
      hasAudio: false,
      loop: true,
      sourceBytes: file.size,
      reencoded: true,
    };
  } finally {
    decoder.close();
  }
};

const JOBS: Record<VideoJob, (file: File) => Promise<CompressedVideo>> = {
  video: compressVideo,
  gif: compressGif,
};

const run = async (file: File, job: VideoJob) => {
  isCanceled = false;
  lastProgress = 0;
  try {
    post({ type: "done", video: await JOBS[job](file) });
  } catch (error) {
    if (isCanceled) post({ type: "canceled" });
    else if (error instanceof ProofMediaError) post({ type: "failed", code: error.code });
    else post({ type: "failed", code: "unreadable" });
  } finally {
    cancelCurrent = null;
  }
};

addEventListener("message", (event: MessageEvent<VideoWorkerRequest>) => {
  const request = event.data;
  if (request.type === "start") {
    void run(request.file, request.job);
    return;
  }
  isCanceled = true;
  void cancelCurrent?.();
});
