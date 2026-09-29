import {
  emptySetup,
  isSetupReady,
  isSetupValid,
  type SessionSetup,
  setupImageIds,
  summarizeGame,
  withoutImages,
} from "@gamemash/games/config";
import { SessionSetupSchema } from "@gamemash/games/schemas";
import {
  AVATAR_MAX_BYTES,
  AVATAR_MAX_DIMENSION,
  type Character,
  type CreateSessionResponse,
  hasHiddenCharacters,
  type JoinSessionResponse,
  type LobbyState,
  MAX_PLAYERS,
  normalizePlayerName,
  PLAYER_NAME_MAX_LENGTH,
  playerNameKey,
  randomCharacter,
} from "@gamemash/shared";
import { type Static, Type } from "typebox";
import { Value } from "typebox/value";
import type { LobbyNotifier } from "../lobby/notifier.js";
import { createImageService } from "../media/image-service.js";
import type { ImageStore } from "../media/image-store.js";
import { sessionExpiresAt } from "./expiry.js";
import { inspectImage } from "./image.js";
import { fail, type Result } from "./result.js";
import { createId, createRoomCode, createSecret, hashSecret, matchesSecretHash } from "./secrets.js";
import type { AvatarChangeResult, PlayerRecord, SessionRecord, SessionStore } from "./store.js";

const MAX_ROOM_CODE_ATTEMPTS = 20;

export class RoomCodesExhaustedError extends Error {
  constructor() {
    super("could not find a free room code");
  }
}

export type { Result } from "./result.js";

const isValidName = (name: string) =>
  name.length > 0 && [...name].length <= PLAYER_NAME_MAX_LENGTH && !hasHiddenCharacters(name);

const LineupEntrySchema = Type.Object({
  id: Type.String(),
  type: Type.String(),
  roundCount: Type.Number(),
  roundSeconds: Type.Object({ min: Type.Number(), max: Type.Number() }),
});

const LobbySummarySchema = Type.Object({
  name: Type.String(),
  lineup: Type.Array(LineupEntrySchema),
});
type LobbySummary = Static<typeof LobbySummarySchema>;

const EMPTY_SUMMARY: LobbySummary = { name: "", lineup: [] };

const parseJson = <T>(json: string | null, isValid: (value: unknown) => value is T): T | null => {
  if (!json) return null;
  try {
    const value: unknown = JSON.parse(json);
    return isValid(value) ? value : null;
  } catch {
    return null;
  }
};

const isSetup = (value: unknown): value is SessionSetup => Value.Check(SessionSetupSchema, value);
const isSummary = (value: unknown): value is LobbySummary => Value.Check(LobbySummarySchema, value);

export type ServiceLogger = {
  warn: (details: Record<string, unknown>, message: string) => void;
};

export type SessionServiceDeps = {
  store: SessionStore;
  notifier?: LobbyNotifier | undefined;
  now?: (() => number) | undefined;
  roomCode?: (() => string) | undefined;
  maxPlayers?: number | undefined;
  log?: ServiceLogger | undefined;
  images?: ImageStore | undefined;
  maxActiveImages?: number | undefined;
};

export const createSessionService = ({
  store,
  notifier,
  now = Date.now,
  roomCode = createRoomCode,
  maxPlayers = MAX_PLAYERS,
  log,
  images,
  maxActiveImages,
}: SessionServiceDeps) => {
  const media = createImageService({ store, images, now, maxActiveImages });

  const readSetup = async (sessionId: string) => {
    const json = await store.getSetup(sessionId);
    const setup = parseJson(json, isSetup);
    if (json && !setup) log?.warn({ sessionId }, "stored setup failed validation");
    return setup ?? emptySetup();
  };

  const touch = async (session: SessionRecord) => store.touch(session, sessionExpiresAt(session.createdAt, now()));

  const create = async (): Promise<CreateSessionResponse> => {
    const hostToken = createSecret();
    const createdAt = now();
    for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt += 1) {
      const session: SessionRecord = {
        id: createId(),
        roomCode: roomCode(),
        status: "lobby",
        hostTokenHash: hashSecret(hostToken),
        createdAt,
      };
      if ((await store.create(session, sessionExpiresAt(createdAt, createdAt))) === "created") {
        return { sessionId: session.id, roomCode: session.roomCode, hostToken };
      }
    }
    throw new RoomCodesExhaustedError();
  };

  const join = async (sessionId: string, rawName: string): Promise<Result<JoinSessionResponse>> => {
    const name = normalizePlayerName(rawName);
    if (!isValidName(name)) return fail("invalid_name");
    const session = await store.findById(sessionId);
    if (!session) return fail("room_not_found");
    if (session.status === "finished") return fail("session_ended");

    const playerToken = createSecret();
    const player: PlayerRecord = {
      id: createId(),
      name,
      tokenHash: hashSecret(playerToken),
      joinedAt: now(),
      character: randomCharacter(),
    };
    const result = await store.addPlayer(sessionId, player, {
      nameKey: playerNameKey(name),
      maxPlayers,
      expiresAt: sessionExpiresAt(session.createdAt, now()),
    });
    if (result === "session_not_found") return fail("room_not_found");
    if (result !== "added") return fail(result);

    await touch(session);
    notifier?.notify(sessionId);
    return { ok: true, value: { playerId: player.id, playerToken } };
  };

  const authenticateHost = async (sessionId: string, hostToken: string) => {
    const session = await store.findById(sessionId);
    return session && matchesSecretHash(hostToken, session.hostTokenHash) ? session : null;
  };

  const authenticatePlayer = async (sessionId: string, playerId: string, playerToken: string) => {
    const [session, player] = await Promise.all([store.findById(sessionId), store.findPlayer(sessionId, playerId)]);
    return session && player && matchesSecretHash(playerToken, player.tokenHash) ? { session, player } : null;
  };

  const finishAvatarChange = async <T>(
    session: SessionRecord,
    result: AvatarChangeResult,
    value: T,
  ): Promise<Result<T>> => {
    if (result === "locked") return fail("avatar_locked");
    if (result !== "saved") return fail("unauthorized");
    await touch(session);
    notifier?.notify(session.id);
    return { ok: true, value };
  };

  const setAvatar = async (
    sessionId: string,
    playerId: string,
    playerToken: string,
    bytes: Buffer,
  ): Promise<Result<{ version: number }>> => {
    const match = await authenticatePlayer(sessionId, playerId, playerToken);
    if (!match) return fail("unauthorized");
    const image = bytes.length <= AVATAR_MAX_BYTES ? inspectImage(bytes) : null;
    const isAllowed =
      image !== null &&
      image.width > 0 &&
      image.height > 0 &&
      image.width <= AVATAR_MAX_DIMENSION &&
      image.height <= AVATAR_MAX_DIMENSION;
    if (!image || !isAllowed) return fail("invalid_image");

    const version = now();
    const result = await store.setAvatar(
      sessionId,
      playerId,
      { bytes, type: image.type, version },
      sessionExpiresAt(match.session.createdAt, now()),
    );
    return finishAvatarChange(match.session, result, { version });
  };

  const setCharacter = async (
    sessionId: string,
    playerId: string,
    playerToken: string,
    character: Character,
  ): Promise<Result<null>> => {
    const match = await authenticatePlayer(sessionId, playerId, playerToken);
    if (!match) return fail("unauthorized");
    const result = await store.setCharacter(
      sessionId,
      { ...match.player, character },
      sessionExpiresAt(match.session.createdAt, now()),
    );
    return finishAvatarChange(match.session, result, null);
  };

  const removeAvatar = async (sessionId: string, playerId: string, playerToken: string): Promise<Result<null>> => {
    const match = await authenticatePlayer(sessionId, playerId, playerToken);
    if (!match) return fail("unauthorized");
    const result = await store.removeAvatar(sessionId, playerId, sessionExpiresAt(match.session.createdAt, now()));
    return finishAvatarChange(match.session, result, null);
  };

  const pruneImages = async (sessionId: string, usedIds: string[]) => {
    try {
      await media.pruneImages(sessionId, usedIds);
    } catch (error) {
      log?.warn({ sessionId, error }, "could not delete unused images");
    }
  };

  const getSetup = async (session: SessionRecord) => {
    const setup = await readSetup(session.id);
    return media.imagesEnabled ? setup : withoutImages(setup);
  };

  const saveSetup = async (session: SessionRecord, submitted: SessionSetup): Promise<Result<null>> => {
    const setup = media.imagesEnabled ? submitted : withoutImages(submitted);
    if (!isSetupValid(setup) || hasHiddenCharacters(setup.name)) return fail("bad_request");
    const imageIds = setupImageIds(setup);
    if (!(await media.hasImages(session.id, imageIds))) return fail("bad_request");
    const summary: LobbySummary = { name: setup.name, lineup: setup.games.map(summarizeGame) };
    const result = await store.saveSetup(
      session.id,
      JSON.stringify(setup),
      JSON.stringify(summary),
      sessionExpiresAt(session.createdAt, now()),
    );
    if (result === "session_not_found") return fail("unauthorized");
    if (result === "setup_locked") return fail("setup_locked");
    await touch(session);
    if (result === "changed") notifier?.notify(session.id);
    await pruneImages(session.id, imageIds);
    return { ok: true, value: null };
  };

  const lobbyState = async (sessionId: string, connectedPlayerIds: Set<string>): Promise<LobbyState | null> => {
    const [session, players, avatarVersions, summaryJson] = await Promise.all([
      store.findById(sessionId),
      store.listPlayers(sessionId),
      store.avatarVersions(sessionId),
      store.getLobbySummary(sessionId),
    ]);
    if (!session) return null;
    const summary = parseJson(summaryJson, isSummary) ?? EMPTY_SUMMARY;
    return {
      sessionId: session.id,
      roomCode: session.roomCode,
      sessionName: summary.name,
      lineup: summary.lineup,
      status: session.status,
      maxPlayers,
      players: players.map((player) => ({
        id: player.id,
        name: player.name,
        joinedAt: player.joinedAt,
        isConnected: connectedPlayerIds.has(player.id),
        avatarVersion: avatarVersions.get(player.id) ?? null,
        character: player.character,
      })),
    };
  };

  const kick = async (sessionId: string, playerId: string): Promise<Result<null>> => {
    const [session, player] = await Promise.all([store.findById(sessionId), store.findPlayer(sessionId, playerId)]);
    if (!session) return fail("room_not_found");
    if (!player) return fail("not_found");
    const result = await store.removePlayer(
      sessionId,
      playerId,
      playerNameKey(player.name),
      sessionExpiresAt(session.createdAt, now()),
    );
    if (result === "locked") return fail("kick_locked");
    if (result === "session_not_found") return fail("room_not_found");
    if (result === "player_not_found") return fail("not_found");
    await touch(session);
    notifier?.notify(sessionId);
    return { ok: true, value: null };
  };

  const isRemoved = async (sessionId: string, playerId: string) => {
    const [session, player] = await Promise.all([store.findById(sessionId), store.findPlayer(sessionId, playerId)]);
    return session !== null && player === null;
  };

  const start = async (sessionId: string): Promise<Result<null>> => {
    const session = await store.findById(sessionId);
    if (!session) return fail("room_not_found");
    if (session.status === "finished") return fail("session_ended");
    if (session.status === "playing") return { ok: true, value: null };
    if (!isSetupReady(await readSetup(sessionId))) return fail("setup_incomplete");
    if (!(await store.setStatus(sessionId, "playing"))) return fail("room_not_found");
    await touch(session);
    notifier?.notify(sessionId);
    return { ok: true, value: null };
  };

  const keepAlive = async (sessionId: string) => {
    const session = await store.findById(sessionId);
    if (!session) return false;
    await touch(session);
    return true;
  };

  return {
    create,
    findByRoomCode: (code: string) => store.findByRoomCode(code),
    join,
    authenticateHost,
    authenticatePlayer,
    setAvatar,
    setCharacter,
    removeAvatar,
    getAvatar: (sessionId: string, playerId: string) => store.getAvatar(sessionId, playerId),
    getSetup,
    readSetup,
    saveSetup,
    lobbyState,
    start,
    kick,
    isRemoved,
    keepAlive,
    ...media,
  };
};

export type SessionService = ReturnType<typeof createSessionService>;
