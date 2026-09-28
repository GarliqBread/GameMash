import { AVATAR_MAX_BYTES, AVATAR_SIZE } from "@gamemash/shared";
import { fetchJson } from "./api";

const QUALITIES = [0.85, 0.7, 0.55, 0.4];
const BACKGROUND = "#ffffff";
const DECODE_WIDTH = AVATAR_SIZE * 4;
const FALLBACK_TYPE = "image/jpeg";

export class AvatarTooLargeError extends Error {
  constructor() {
    super("avatar could not be compressed enough");
  }
}

const drawSquare = (bitmap: ImageBitmap) => {
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas is not supported");
  const scale = Math.max(AVATAR_SIZE / bitmap.width, AVATAR_SIZE / bitmap.height);
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  context.fillStyle = BACKGROUND;
  context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, (AVATAR_SIZE - width) / 2, (AVATAR_SIZE - height) / 2, width, height);
  return canvas;
};

const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

const encodeSmallest = async (canvas: HTMLCanvasElement, qualities: number[], type = "image/webp"): Promise<Blob> => {
  const [quality, ...rest] = qualities;
  if (quality === undefined) throw new AvatarTooLargeError();
  const blob = await encode(canvas, type, quality);
  if (blob?.type !== type) {
    if (type === FALLBACK_TYPE) throw new Error("canvas cannot encode images");
    return encodeSmallest(canvas, qualities, FALLBACK_TYPE);
  }
  if (blob.size <= AVATAR_MAX_BYTES) return blob;
  return encodeSmallest(canvas, rest, type);
};

const decode = async (file: Blob) => {
  const downscale: ImageBitmapOptions = { resizeWidth: DECODE_WIDTH, resizeQuality: "high" };
  try {
    return await createImageBitmap(file, { ...downscale, imageOrientation: "from-image" });
  } catch {
    return createImageBitmap(file, downscale);
  }
};

export const resizeAvatar = async (file: Blob) => {
  const bitmap = await decode(file);
  try {
    return await encodeSmallest(drawSquare(bitmap), QUALITIES);
  } finally {
    bitmap.close();
  }
};

export const uploadAvatar = (sessionId: string, playerId: string, playerToken: string, avatar: Blob) =>
  fetchJson<{ avatarVersion: number }>(`/api/sessions/${sessionId}/players/${playerId}/avatar`, {
    method: "PUT",
    headers: { "content-type": avatar.type, authorization: `Bearer ${playerToken}` },
    body: avatar,
  });
