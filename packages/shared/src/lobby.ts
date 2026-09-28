import type { ApiError } from "./errors.js";
import type { SessionStatus } from "./schemas.js";

export type {
  HandshakeAuth,
  JoinSessionBody,
  JoinSessionResponse,
  PlayerParams,
  SessionParams,
} from "./schemas.js";

export const PLAYER_NAME_MAX_LENGTH = 20;

export const AVATAR_SIZE = 256;
export const AVATAR_MAX_BYTES = 32 * 1024;
export const AVATAR_MAX_DIMENSION = 512;
export type AvatarContentType = "image/webp" | "image/jpeg";
export const AVATAR_CONTENT_TYPES: AvatarContentType[] = ["image/webp", "image/jpeg"];

export const avatarPath = (sessionId: string, playerId: string, version: number) =>
  `/api/sessions/${sessionId}/players/${playerId}/avatar?v=${version}`;

export const normalizePlayerName = (raw: string) => raw.normalize("NFC").trim().replace(/\s+/g, " ");

export const playerNameKey = (name: string) => normalizePlayerName(name).normalize("NFKC").toLocaleLowerCase("und");

export type LobbyPlayer = {
  id: string;
  name: string;
  joinedAt: number;
  isConnected: boolean;
  avatarVersion: number | null;
};

export type LineupEntry = {
  id: string;
  type: string;
  roundCount: number;
  roundSeconds: number;
};

export type LobbyState = {
  sessionId: string;
  roomCode: string;
  sessionName: string;
  lineup: LineupEntry[];
  status: SessionStatus;
  players: LobbyPlayer[];
  maxPlayers: number;
};

export type SocketAck = { ok: true } | { ok: false; error: ApiError };

export type ServerToClientEvents = {
  "lobby:state": (state: LobbyState) => void;
  "session:ended": () => void;
};

export type ClientToServerEvents = {
  "session:start": (ack: (result: SocketAck) => void) => void;
};

export const SOCKET_AUTH_ERROR = "unauthorized";
