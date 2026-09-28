import { AVATAR_MAX_BYTES, AVATAR_SIZE } from "@gamemash/shared";
import { fetchJson } from "./api";
import { createCanvas, decodeImage, encodeSmallest } from "./image-encoding";

const QUALITIES = [0.85, 0.7, 0.55, 0.4];
const BACKGROUND = "#ffffff";
const DECODE_WIDTH = AVATAR_SIZE * 4;

const drawSquare = (bitmap: ImageBitmap) => {
  const { canvas, context } = createCanvas(AVATAR_SIZE, AVATAR_SIZE);
  const scale = Math.max(AVATAR_SIZE / bitmap.width, AVATAR_SIZE / bitmap.height);
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  context.fillStyle = BACKGROUND;
  context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  context.drawImage(bitmap, (AVATAR_SIZE - width) / 2, (AVATAR_SIZE - height) / 2, width, height);
  return canvas;
};

export const resizeAvatar = async (file: Blob) => {
  const bitmap = await decodeImage(file, { resizeWidth: DECODE_WIDTH, resizeQuality: "high" });
  try {
    return await encodeSmallest(drawSquare(bitmap), QUALITIES, AVATAR_MAX_BYTES);
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
