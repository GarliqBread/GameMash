import { AVATAR_MAX_BYTES, AVATAR_SIZE, type Character } from "@gamemash/shared";
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

export type PlayerAuth = {
  sessionId: string;
  playerId: string;
  playerToken: string;
};

const playerUrl = ({ sessionId, playerId }: PlayerAuth, path: string) =>
  `/api/sessions/${sessionId}/players/${playerId}/${path}`;

const bearer = ({ playerToken }: PlayerAuth) => ({ authorization: `Bearer ${playerToken}` });

export const uploadAvatar = (player: PlayerAuth, avatar: Blob) =>
  fetchJson<{ avatarVersion: number }>(playerUrl(player, "avatar"), {
    method: "PUT",
    headers: { "content-type": avatar.type, ...bearer(player) },
    body: avatar,
  });

export const removeAvatar = (player: PlayerAuth) =>
  fetchJson<void>(playerUrl(player, "avatar"), { method: "DELETE", headers: bearer(player) });

export const saveCharacter = (player: PlayerAuth, character: Character) =>
  fetchJson<void>(playerUrl(player, "character"), {
    method: "PUT",
    headers: { "content-type": "application/json", ...bearer(player) },
    body: JSON.stringify(character),
  });
