import { AVATAR_CONTENT_TYPES } from "@gamemash/shared";
import { CharacterSchema, SessionStatusSchema } from "@gamemash/shared/schemas";
import { RESP_TYPES } from "redis";
import { Type } from "typebox";
import { Value } from "typebox/value";
import type { RedisClient } from "../redis.js";
import type {
  AddImageResult,
  AddPlayerResult,
  AvatarChangeResult,
  AvatarMeta,
  GameRecord,
  PlayerRecord,
  RemovePlayerResult,
  SaveGameResult,
  SaveSetupResult,
  SaveUploadResult,
  SessionRecord,
  SessionStore,
  SubmitInputResult,
} from "./store.js";

const DEFAULT_PREFIX = "gm:";

const PlayerRecordSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  tokenHash: Type.String(),
  joinedAt: Type.Number(),
  character: CharacterSchema,
});

const ADD_PLAYER_RESULTS: AddPlayerResult[] = ["added", "name_taken", "session_full", "session_not_found"];
const REMOVE_PLAYER_RESULTS: RemovePlayerResult[] = ["removed", "locked", "player_not_found", "session_not_found"];
const AVATAR_CHANGE_RESULTS: AvatarChangeResult[] = ["saved", "locked", "player_not_found", "session_not_found"];
const SAVE_SETUP_RESULTS: SaveSetupResult[] = ["changed", "unchanged", "setup_locked", "session_not_found"];
const ADD_IMAGE_RESULTS: AddImageResult[] = [
  "added",
  "limit_reached",
  "storage_full",
  "setup_locked",
  "session_not_found",
];
const SAVE_GAME_RESULTS: SaveGameResult[] = ["saved", "conflict", "session_not_found"];
const SUBMIT_INPUT_RESULTS: SubmitInputResult[] = ["accepted", "duplicate", "closed"];
const SAVE_UPLOAD_RESULTS: SaveUploadResult[] = ["saved", "closed"];

const AvatarMetaSchema = Type.Object({
  type: Type.Enum(AVATAR_CONTENT_TYPES),
  version: Type.Number(),
});

const RELEASE_SCAN_COUNT = 500;

const activeImageMember = (sessionId: string, imageId: string) => `${sessionId}/${imageId}`;

const keys = (prefix: string) => ({
  session: (id: string) => `${prefix}session:${id}`,
  players: (id: string) => `${prefix}session:${id}:players`,
  names: (id: string) => `${prefix}session:${id}:names`,
  avatars: (id: string) => `${prefix}session:${id}:avatars`,
  avatarMeta: (id: string) => `${prefix}session:${id}:avatar-meta`,
  setup: (id: string) => `${prefix}session:${id}:setup`,
  images: (id: string) => `${prefix}session:${id}:images`,
  game: (id: string) => `${prefix}session:${id}:game`,
  inputs: (id: string) => `${prefix}session:${id}:inputs`,
  uploads: (id: string) => `${prefix}session:${id}:uploads`,
  room: (roomCode: string) => `${prefix}room:${roomCode}`,
  activeImages: () => `${prefix}images:active`,
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

const toRemovePlayerResult = (value: unknown): RemovePlayerResult => {
  const result = REMOVE_PLAYER_RESULTS.find((known) => known === value);
  if (!result) throw new Error(`unexpected remove player result: ${String(value)}`);
  return result;
};

const toAvatarChangeResult = (value: unknown): AvatarChangeResult => {
  const result = AVATAR_CHANGE_RESULTS.find((known) => known === value);
  if (!result) throw new Error(`unexpected avatar change result: ${String(value)}`);
  return result;
};

const isSaveSetupResult = (value: unknown): value is SaveSetupResult =>
  SAVE_SETUP_RESULTS.some((result) => result === value);

const isAddImageResult = (value: unknown): value is AddImageResult =>
  ADD_IMAGE_RESULTS.some((result) => result === value);

const isSaveGameResult = (value: unknown): value is SaveGameResult =>
  SAVE_GAME_RESULTS.some((result) => result === value);

const isSaveUploadResult = (value: unknown): value is SaveUploadResult =>
  SAVE_UPLOAD_RESULTS.some((result) => result === value);

const isSubmitInputResult = (value: unknown): value is SubmitInputResult =>
  SUBMIT_INPUT_RESULTS.some((result) => result === value);

const toGameRecord = ({ version, state }: Record<string, string>): GameRecord | null => {
  const parsed = Number(version);
  return state !== undefined && Number.isInteger(parsed) && parsed > 0 ? { version: parsed, state } : null;
};

const isAddPlayerResult = (value: unknown): value is AddPlayerResult =>
  ADD_PLAYER_RESULTS.some((result) => result === value);

export const createRedisSessionStore = (redis: RedisClient, prefix = DEFAULT_PREFIX): SessionStore => {
  const key = keys(prefix);

  const findById = async (sessionId: string) => fromHash(await redis.hGetAll(key.session(sessionId)));
  const avatarKeys = (sessionId: string) => [
    key.session(sessionId),
    key.players(sessionId),
    key.avatars(sessionId),
    key.avatarMeta(sessionId),
  ];
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
    removePlayer: async (sessionId, playerId, nameKey, expiresAt) => {
      const result = await redis.removePlayer(
        [
          key.session(sessionId),
          key.players(sessionId),
          key.names(sessionId),
          key.avatars(sessionId),
          key.avatarMeta(sessionId),
        ],
        [playerId, nameKey, String(expiresAt)],
      );
      return toRemovePlayerResult(result);
    },
    setAvatar: async (sessionId, playerId, { bytes, type, version }, expiresAt) => {
      const result = await redis.setAvatar(avatarKeys(sessionId), [
        playerId,
        bytes,
        JSON.stringify({ type, version }),
        String(expiresAt),
      ]);
      return toAvatarChangeResult(result);
    },
    removeAvatar: async (sessionId, playerId, expiresAt) =>
      toAvatarChangeResult(await redis.removeAvatar(avatarKeys(sessionId), [playerId, String(expiresAt)])),
    setCharacter: async (sessionId, player, expiresAt) =>
      toAvatarChangeResult(
        await redis.setCharacter(avatarKeys(sessionId), [player.id, JSON.stringify(player), String(expiresAt)]),
      ),
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
    addImage: async (sessionId, imageId, { maxPerSession, maxActive, expiresAt, leaseUntil, uploadedAt }) => {
      const result = await redis.addImage(
        [key.session(sessionId), key.images(sessionId), key.activeImages()],
        [
          imageId,
          String(maxPerSession),
          String(expiresAt),
          activeImageMember(sessionId, imageId),
          String(maxActive),
          String(leaseUntil),
          String(uploadedAt),
        ],
      );
      if (!isAddImageResult(result)) throw new Error(`unexpected add image result: ${String(result)}`);
      return result;
    },
    removeImages: async (sessionId, imageIds) => {
      if (imageIds.length === 0) return;
      await redis
        .multi()
        .zRem(key.images(sessionId), imageIds)
        .zRem(
          key.activeImages(),
          imageIds.map((id) => activeImageMember(sessionId, id)),
        )
        .exec();
    },
    releaseImages: async (sessionId) => {
      const match = `${activeImageMember(sessionId, "")}*`;
      for await (const batch of redis.zScanIterator(key.activeImages(), { MATCH: match, COUNT: RELEASE_SCAN_COUNT })) {
        if (batch.length > 0)
          await redis.zRem(
            key.activeImages(),
            batch.map((entry) => entry.value),
          );
      }
      await redis.del(key.images(sessionId));
    },
    listImages: async (sessionId) =>
      (await redis.zRangeWithScores(key.images(sessionId), 0, -1)).map((entry) => ({
        id: entry.value,
        uploadedAt: entry.score,
      })),
    getGame: async (sessionId) => toGameRecord(await redis.hGetAll(key.game(sessionId))),
    saveGame: async (sessionId, expectedVersion, state, expiresAt, clearUploads) => {
      const result = await redis.saveGame(
        [key.session(sessionId), key.game(sessionId), key.inputs(sessionId), key.uploads(sessionId)],
        [
          expectedVersion === null ? "" : String(expectedVersion),
          String((expectedVersion ?? 0) + 1),
          state,
          String(expiresAt),
          clearUploads ? "1" : "0",
        ],
      );
      if (!isSaveGameResult(result)) throw new Error(`unexpected save game result: ${String(result)}`);
      return result;
    },
    submitInput: async (sessionId, version, playerId, input, expiresAt, replace) => {
      const result = await redis.submitInput(
        [key.session(sessionId), key.game(sessionId), key.inputs(sessionId)],
        [String(version), playerId, input, String(expiresAt), replace ? "1" : "0"],
      );
      if (!isSubmitInputResult(result)) throw new Error(`unexpected submit input result: ${String(result)}`);
      return result;
    },
    listInputs: async (sessionId) => new Map(Object.entries(await redis.hGetAll(key.inputs(sessionId)))),
    saveUpload: async (sessionId, version, playerId, payload, expiresAt) => {
      const result = await redis.saveUpload(
        [key.session(sessionId), key.game(sessionId), key.uploads(sessionId)],
        [String(version), playerId, payload, String(expiresAt)],
      );
      if (!isSaveUploadResult(result)) throw new Error(`unexpected save upload result: ${String(result)}`);
      return result;
    },
    getUpload: async (sessionId, playerId) => (await redis.hGet(key.uploads(sessionId), playerId)) ?? null,
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
          key.game(session.id),
          key.inputs(session.id),
          key.images(session.id),
          key.uploads(session.id),
        ],
        [session.id, String(expiresAt)],
      );
    },
  };
};
