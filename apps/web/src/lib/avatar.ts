import { AVATAR_MAX_BYTES, AVATAR_SIZE, type Character } from "@gamemash/shared";
import { fetchJson } from "./api";
import { type PlayerCredentials, playerAuthorization } from "./credentials";
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

const playerUrl = ({ sessionId, playerId }: PlayerCredentials, path: string) =>
  `/api/sessions/${sessionId}/players/${playerId}/${path}`;

export const uploadAvatar = (player: PlayerCredentials, avatar: Blob) =>
  fetchJson<{ avatarVersion: number }>(playerUrl(player, "avatar"), {
    method: "PUT",
    headers: { "content-type": avatar.type, ...playerAuthorization(player) },
    body: avatar,
  });

export const removeAvatar = (player: PlayerCredentials) =>
  fetchJson<void>(playerUrl(player, "avatar"), { method: "DELETE", headers: playerAuthorization(player) });

export const saveCharacter = (player: PlayerCredentials, character: Character) =>
  fetchJson<void>(playerUrl(player, "character"), {
    method: "PUT",
    headers: { "content-type": "application/json", ...playerAuthorization(player) },
    body: JSON.stringify(character),
  });
