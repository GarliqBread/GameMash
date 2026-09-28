import { AVATAR_CONTENT_TYPES } from "@gamemash/shared";
import { SessionStatusSchema } from "@gamemash/shared/schemas";
import { RESP_TYPES } from "redis";
import { Type } from "typebox";
import { Value } from "typebox/value";
import type { RedisClient } from "../redis.js";
import type {
  AddPlayerResult,
  AvatarMeta,
  PlayerRecord,
  SaveSetupResult,
  SessionRecord,
  SessionStore,
  SetAvatarResult,
} from "./store.js";

const DEFAULT_PREFIX = "gm:";

const PlayerRecordSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  tokenHash: Type.String(),
  joinedAt: Type.Number(),
});

const ADD_PLAYER_RESULTS: AddPlayerResult[] = ["added", "name_taken", "session_full", "session_not_found"];
const SET_AVATAR_RESULTS: SetAvatarResult[] = ["saved", "player_not_found", "session_not_found"];
const SAVE_SETUP_RESULTS: SaveSetupResult[] = ["changed", "unchanged", "setup_locked", "session_not_found"];

const AvatarMetaSchema = Type.Object({
  type: Type.Enum(AVATAR_CONTENT_TYPES),
  version: Type.Number(),
});

const keys = (prefix: string) => ({
  session: (id: string) => `${prefix}session:${id}`,
  players: (id: string) => `${prefix}session:${id}:players`,
  names: (id: string) => `${prefix}session:${id}:names`,
  avatars: (id: string) => `${prefix}session:${id}:avatars`,
  avatarMeta: (id: string) => `${prefix}session:${id}:avatar-meta`,
  setup: (id: string) => `${prefix}session:${id}:setup`,
  room: (roomCode: string) => `${prefix}room:${roomCode}`,
});

const toHash = (session: SessionRecord) => ({
  id: session.id,
  roomCode: session.roomCode,
  status: session.status,
  hostTokenHash: session.hostTokenHash,
  createdAt: String(session.createdAt),
});

const fromHash = (hash: Record<string, string>): SessionRecord | null => {
  const { id, roomCode, status, hostTokenHash, createdAt } = hash;
  if (!id || !roomCode || !hostTokenHash || !createdAt || !Value.Check(SessionStatusSchema, status)) return null;
  return { id, roomCode, status, hostTokenHash, createdAt: Number(createdAt) };
};

const parsePlayer = (json: string | null | undefined): PlayerRecord | null => {
  if (!json) return null;
  try {
    const value: unknown = JSON.parse(json);
    return Value.Check(PlayerRecordSchema, value) ? value : null;
  } catch {
    return null;
  }
};

const parseAvatarMeta = (json: string | null | undefined): AvatarMeta | null => {
  if (!json) return null;
  try {
    const value: unknown = JSON.parse(json);
    return Value.Check(AvatarMetaSchema, value) ? value : null;
  } catch {
    return null;
  }
};

const isSetAvatarResult = (value: unknown): value is SetAvatarResult =>
  SET_AVATAR_RESULTS.some((result) => result === value);

const isSaveSetupResult = (value: unknown): value is SaveSetupResult =>
  SAVE_SETUP_RESULTS.some((result) => result === value);

const isAddPlayerResult = (value: unknown): value is AddPlayerResult =>
  ADD_PLAYER_RESULTS.some((result) => result === value);

export const createRedisSessionStore = (redis: RedisClient, prefix = DEFAULT_PREFIX): SessionStore => {
  const key = keys(prefix);

  const findById = async (sessionId: string) => fromHash(await redis.hGetAll(key.session(sessionId)));
  const binary = redis.withTypeMapping({ [RESP_TYPES.BLOB_STRING]: Buffer });

  return {
    create: async (session, expiresAt) => {
      const created = await redis.createSession(
        [key.room(session.roomCode), key.session(session.id)],
        [session.id, String(expiresAt), ...Object.entries(toHash(session)).flat()],
      );
      return created === 1 ? "created" : "room_code_taken";
    },
    findByRoomCode: async (roomCode) => {
      const id = await redis.get(key.room(roomCode));
      return id ? findById(id) : null;
    },
    findById,
    addPlayer: async (sessionId, player, { nameKey, maxPlayers, expiresAt }) => {
      const result = await redis.addPlayer(
        [key.session(sessionId), key.players(sessionId), key.names(sessionId)],
        [player.id, JSON.stringify(player), nameKey, String(maxPlayers), String(expiresAt)],
      );
      if (!isAddPlayerResult(result)) throw new Error(`unexpected add player result: ${String(result)}`);
      return result;
    },
    findPlayer: async (sessionId, playerId) => parsePlayer(await redis.hGet(key.players(sessionId), playerId)),
    listPlayers: async (sessionId) => {
      const values = Object.values(await redis.hGetAll(key.players(sessionId)));
      return values
        .map(parsePlayer)
        .filter((player): player is PlayerRecord => player !== null)
        .toSorted((a, b) => a.joinedAt - b.joinedAt);
    },
    setAvatar: async (sessionId, playerId, { bytes, type, version }, expiresAt) => {
      const result = await redis.setAvatar(
        [key.session(sessionId), key.players(sessionId), key.avatars(sessionId), key.avatarMeta(sessionId)],
        [playerId, bytes, JSON.stringify({ type, version }), String(expiresAt)],
      );
      if (!isSetAvatarResult(result)) throw new Error(`unexpected set avatar result: ${String(result)}`);
      return result;
    },
    getAvatar: async (sessionId, playerId) => {
      const [meta, bytes] = await Promise.all([
        redis.hGet(key.avatarMeta(sessionId), playerId),
        binary.hGet(key.avatars(sessionId), playerId),
      ]);
      const parsed = parseAvatarMeta(meta);
      return parsed && Buffer.isBuffer(bytes) ? { ...parsed, bytes } : null;
    },
    avatarVersions: async (sessionId) => {
      const entries = Object.entries(await redis.hGetAll(key.avatarMeta(sessionId)));
      return new Map(
        entries.flatMap(([playerId, json]) => {
          const meta = parseAvatarMeta(json);
          return meta ? [[playerId, meta.version] as [string, number]] : [];
        }),
      );
    },
    setStatus: async (sessionId, status) => (await redis.setSessionStatus([key.session(sessionId)], [status])) === 1,
    getSetup: (sessionId) => redis.get(key.setup(sessionId)),
    getLobbySummary: (sessionId) => redis.hGet(key.session(sessionId), "summary"),
    saveSetup: async (sessionId, setup, summary, expiresAt) => {
      const result = await redis.saveSetup(
        [key.session(sessionId), key.setup(sessionId)],
        [setup, summary, String(expiresAt)],
      );
      if (!isSaveSetupResult(result)) throw new Error(`unexpected save setup result: ${String(result)}`);
      return result;
    },
    touch: async (session, expiresAt) => {
      await redis.touchSession(
        [
          key.session(session.id),
          key.room(session.roomCode),
          key.players(session.id),
          key.names(session.id),
          key.avatars(session.id),
          key.avatarMeta(session.id),
          key.setup(session.id),
        ],
        [session.id, String(expiresAt)],
      );
    },
  };
};
