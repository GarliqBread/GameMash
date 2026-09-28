import type { AvatarContentType, SessionStatus } from "@gamemash/shared";

export type SessionRecord = {
  id: string;
  roomCode: string;
  status: SessionStatus;
  hostTokenHash: string;
  createdAt: number;
};

export type PlayerRecord = {
  id: string;
  name: string;
  tokenHash: string;
  joinedAt: number;
};

export type AvatarMeta = {
  type: AvatarContentType;
  version: number;
};

export type Avatar = AvatarMeta & {
  bytes: Buffer;
};

export type SetAvatarResult = "saved" | "player_not_found" | "session_not_found";

export type SaveSetupResult = "changed" | "unchanged" | "setup_locked" | "session_not_found";

export type GameRecord = {
  version: number;
  state: string;
};

export type SaveGameResult = "saved" | "conflict" | "session_not_found";

export type SubmitInputResult = "accepted" | "duplicate" | "closed";

export type CreateSessionResult = "created" | "room_code_taken";

export type AddPlayerResult = "added" | "name_taken" | "session_full" | "session_not_found";

export type AddPlayerOptions = {
  nameKey: string;
  maxPlayers: number;
  expiresAt: number;
};

export type SessionStore = {
  create: (session: SessionRecord, expiresAt: number) => Promise<CreateSessionResult>;
  findByRoomCode: (roomCode: string) => Promise<SessionRecord | null>;
  findById: (sessionId: string) => Promise<SessionRecord | null>;
  addPlayer: (sessionId: string, player: PlayerRecord, options: AddPlayerOptions) => Promise<AddPlayerResult>;
  findPlayer: (sessionId: string, playerId: string) => Promise<PlayerRecord | null>;
  listPlayers: (sessionId: string) => Promise<PlayerRecord[]>;
  setStatus: (sessionId: string, status: SessionStatus) => Promise<boolean>;
  setAvatar: (sessionId: string, playerId: string, avatar: Avatar, expiresAt: number) => Promise<SetAvatarResult>;
  getAvatar: (sessionId: string, playerId: string) => Promise<Avatar | null>;
  avatarVersions: (sessionId: string) => Promise<Map<string, number>>;
  getSetup: (sessionId: string) => Promise<string | null>;
  saveSetup: (sessionId: string, setup: string, summary: string, expiresAt: number) => Promise<SaveSetupResult>;
  getLobbySummary: (sessionId: string) => Promise<string | null>;
  getGame: (sessionId: string) => Promise<GameRecord | null>;
  saveGame: (
    sessionId: string,
    expectedVersion: number | null,
    state: string,
    expiresAt: number,
  ) => Promise<SaveGameResult>;
  submitInput: (
    sessionId: string,
    version: number,
    playerId: string,
    input: string,
    expiresAt: number,
  ) => Promise<SubmitInputResult>;
  listInputs: (sessionId: string) => Promise<Map<string, string>>;
  touch: (session: SessionRecord, expiresAt: number) => Promise<void>;
};
