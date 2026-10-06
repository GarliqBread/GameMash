import { PROOF_VIDEO_MAX_LONG_SIDE, PROOF_VIDEO_MAX_SHORT_SIDE } from "@gamemash/shared";
import { PROOF_VIDEO_COPY_MAX_BITRATE, PROOF_VIDEO_MAX_FPS } from "./limits";

export type Size = { width: number; height: number };

export type VideoSource = Size & {
  videoCodec: string | null;
  audioCodec: string | null;
  framesPerSecond: number;
  bitsPerSecond: number;
};

const FRAME_RATE_TOLERANCE = 0.5;

const even = (value: number) => Math.max(2, Math.round(value / 2) * 2);

export const scaleWithin = ({ width, height }: Size, maxShort: number, maxLong: number) =>
  Math.min(1, maxShort / Math.min(width, height), maxLong / Math.max(width, height));

export const fitWithin = (size: Size, maxShort: number, maxLong: number): Size => {
  const scale = scaleWithin(size, maxShort, maxLong);
  return { width: even(size.width * scale), height: even(size.height * scale) };
};

export const proofVideoSize = (size: Size) => fitWithin(size, PROOF_VIDEO_MAX_SHORT_SIDE, PROOF_VIDEO_MAX_LONG_SIDE);

export const canKeepVideo = (source: VideoSource) =>
  source.videoCodec === "avc" &&
  (source.audioCodec === null || source.audioCodec === "aac") &&
  scaleWithin(source, PROOF_VIDEO_MAX_SHORT_SIDE, PROOF_VIDEO_MAX_LONG_SIDE) === 1 &&
  source.framesPerSecond <= PROOF_VIDEO_MAX_FPS + FRAME_RATE_TOLERANCE &&
  source.bitsPerSecond <= PROOF_VIDEO_COPY_MAX_BITRATE;
