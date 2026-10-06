import { parentPort, workerData } from "node:worker_threads";
import {
  MS_PER_SECOND,
  PROOF_VIDEO_MAX_DURATION_MS,
  PROOF_VIDEO_MAX_LONG_SIDE,
  PROOF_VIDEO_MAX_SHORT_SIDE,
} from "@gamemash/shared";
import { BufferSource, Input, type InputAudioTrack, MP4 } from "mediabunny";

type VideoInfo = { width: number; height: number; durationMs: number };

const DURATION_TOLERANCE_MS = 500;

const isAacOnly = async (tracks: InputAudioTrack[]) =>
  (await Promise.all(tracks.map((track) => track.getCodec()))).every((codec) => codec === "aac");

const readVideo = async (input: Input): Promise<VideoInfo | null> => {
  const videoTracks = await input.getVideoTracks();
  const [video] = videoTracks;
  if (videoTracks.length !== 1 || !video || (await video.getCodec()) !== "avc") return null;
  if (!(await isAacOnly(await input.getAudioTracks()))) return null;
  const width = await video.getDisplayWidth();
  const height = await video.getDisplayHeight();
  const durationMs = Math.round((await input.computeDuration()) * MS_PER_SECOND);
  return { width, height, durationMs };
};

const isWithinLimits = ({ width, height, durationMs }: VideoInfo) =>
  width > 0 &&
  height > 0 &&
  Math.max(width, height) <= PROOF_VIDEO_MAX_LONG_SIDE &&
  Math.min(width, height) <= PROOF_VIDEO_MAX_SHORT_SIDE &&
  durationMs > 0 &&
  durationMs <= PROOF_VIDEO_MAX_DURATION_MS + DURATION_TOLERANCE_MS;

const inspect = async (bytes: Uint8Array): Promise<VideoInfo | null> => {
  const input = new Input({ source: new BufferSource(bytes), formats: [MP4] });
  try {
    const info = await readVideo(input);
    return info && isWithinLimits(info) ? info : null;
  } catch {
    return null;
  } finally {
    input.dispose();
  }
};

parentPort?.postMessage(await inspect(workerData as Uint8Array));
