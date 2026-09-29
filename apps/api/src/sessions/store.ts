import type { AvatarContentType, Character, SessionStatus } from "@gamemash/shared";

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
  character: Character;
};

export type AvatarMeta = {
  type: AvatarContentType;
  version: number;
};

export type Avatar = AvatarMeta & {
  bytes: Buffer;
};

export type RemovePlayerResult = "removed" | "locked" | "player_not_found" | "session_not_found";

export type AvatarChangeResult = "saved" | "locked" | "player_not_found" | "session_not_found";

export type SaveSetupResult = "changed" | "unchanged" | "setup_locked" | "session_not_found";

export type GameRecord = {
  version: number;
  state: string;
};

export type AddImageResult = "added" | "limit_reached" | "storage_full" | "setup_locked" | "session_not_found";

export type ImageLimits = {
  maxPerSession: number;
  maxActive: number;
  expiresAt: number;
  leaseUntil: number;
  uploadedAt: number;
};

export type SessionImage = {
  id: string;
  uploadedAt: number;
};

export type SaveGameResult = "saved" | "conflict" | "session_not_found";

export type SubmitInputResult = "accepted" | "duplicate" | "closed";

export type SaveUploadResult = "saved" | "closed";

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
  removePlayer: (
    sessionId: string,
    playerId: string,
    nameKey: string,
    expiresAt: number,
  ) => Promise<RemovePlayerResult>;
  setStatus: (sessionId: string, status: SessionStatus) => Promise<boolean>;
  setAvatar: (sessionId: string, playerId: string, avatar: Avatar, expiresAt: number) => Promise<AvatarChangeResult>;
  removeAvatar: (sessionId: string, playerId: string, expiresAt: number) => Promise<AvatarChangeResult>;
  setCharacter: (sessionId: string, player: PlayerRecord, expiresAt: number) => Promise<AvatarChangeResult>;
  getAvatar: (sessionId: string, playerId: string) => Promise<Avatar | null>;
  avatarVersions: (sessionId: string) => Promise<Map<string, number>>;
  getSetup: (sessionId: string) => Promise<string | null>;
  saveSetup: (sessionId: string, setup: string, summary: string, expiresAt: number) => Promise<SaveSetupResult>;
  getLobbySummary: (sessionId: string) => Promise<string | null>;
  addImage: (sessionId: string, imageId: string, limits: ImageLimits) => Promise<AddImageResult>;
  removeImages: (sessionId: string, imageIds: string[]) => Promise<void>;
  releaseImages: (sessionId: string) => Promise<void>;
  listImages: (sessionId: string) => Promise<SessionImage[]>;
  getGame: (sessionId: string) => Promise<GameRecord | null>;
  saveGame: (
    sessionId: string,
    expectedVersion: number | null,
    state: string,
    expiresAt: number,
    clearUploads: boolean,
  ) => Promise<SaveGameResult>;
  submitInput: (
    sessionId: string,
    version: number,
    playerId: string,
    input: string,
    expiresAt: number,
    replace: boolean,
  ) => Promise<SubmitInputResult>;
  listInputs: (sessionId: string) => Promise<Map<string, string>>;
  saveUpload: (
    sessionId: string,
    version: number,
    playerId: string,
    payload: string,
    expiresAt: number,
  ) => Promise<SaveUploadResult>;
  getUpload: (sessionId: string, playerId: string) => Promise<string | null>;
  touch: (session: SessionRecord, expiresAt: number) => Promise<void>;
};
