export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const ROOM_CODE_LENGTH = 4;
export const MAX_PLAYERS = 100;
export const SESSION_IDLE_TTL_SECONDS = 30 * 60;
export const SESSION_MAX_AGE_SECONDS = 6 * 60 * 60;

export const normalizeRoomCode = (raw: string) => raw.trim().toUpperCase();

export const isRoomCode = (value: string) =>
  value.length === ROOM_CODE_LENGTH && [...value].every((letter) => ROOM_CODE_ALPHABET.includes(letter));

export type {
  CreateSessionResponse,
  RoomLookupParams,
  RoomLookupResponse,
  SessionStatus,
} from "./schemas.js";
