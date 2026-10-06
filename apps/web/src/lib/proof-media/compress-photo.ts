import { PROOF_PHOTO_MAX_BYTES } from "@gamemash/shared";
import { createCanvas, decodeImage, encodeSmallest, ImageTooLargeError } from "../image-encoding";
import { ProofMediaError } from "./errors";
import { PROOF_BACKGROUND, PROOF_PHOTO_MAX_SIDE, PROOF_PHOTO_QUALITIES } from "./limits";
import type { CompressedPhoto } from "./types";
import { scaleWithin } from "./video-plan";

const photoSize = (size: { width: number; height: number }) => {
  const scale = scaleWithin(size, PROOF_PHOTO_MAX_SIDE, PROOF_PHOTO_MAX_SIDE);
  return { width: Math.max(1, Math.round(size.width * scale)), height: Math.max(1, Math.round(size.height * scale)) };
};

const decode = (file: Blob) => decodeImage(file).catch(() => Promise.reject(new ProofMediaError("unreadable")));

const encode = async (canvas: HTMLCanvasElement) => {
  try {
    return await encodeSmallest(canvas, PROOF_PHOTO_QUALITIES, PROOF_PHOTO_MAX_BYTES);
  } catch (error) {
    throw new ProofMediaError(error instanceof ImageTooLargeError ? "too_large" : "unsupported_browser");
  }
};

export const compressPhoto = async (file: File): Promise<CompressedPhoto> => {
  const bitmap = await decode(file);
  try {
    const size = photoSize(bitmap);
    const { canvas, context } = createCanvas(size.width, size.height);
    context.fillStyle = PROOF_BACKGROUND;
    context.fillRect(0, 0, size.width, size.height);
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    return { kind: "image", file: await encode(canvas), ...size, sourceBytes: file.size };
  } finally {
    bitmap.close();
  }
};

export const keepGif = async (file: File): Promise<CompressedPhoto | null> => {
  const bitmap = await decode(file);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  if (Math.max(size.width, size.height) > PROOF_PHOTO_MAX_SIDE) return null;
  return { kind: "image", file, ...size, sourceBytes: file.size };
};
