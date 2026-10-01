import { normalizeRoomCode, ROOM_CODE_LENGTH } from "@gamemash/shared";

export const toRoomCodeInput = (raw: string) =>
  normalizeRoomCode(raw)
    .replace(/[^A-Z]/g, "")
    .slice(0, ROOM_CODE_LENGTH);
