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
import { parseJson } from "../json.js";
import type { Notifier } from "../lobby/notifier.js";
import { createImageService } from "../media/image-service.js";
import type { ImageStore } from "../media/image-store.js";
import { sessionExpiresAt } from "./expiry.js";
import { inspectImage } from "./image.js";
import { fail, type Result } from "./result.js";
import { createId, createRoomCode, createSecret, hashSecret, matchesSecretHash } from "./secrets.js";
import { createSetupTransfer } from "./setup-transfer.js";
import type { AvatarChangeResult, PlayerRecord, SessionRecord, SessionStore } from "./store.js";

const MAX_ROOM_CODE_ATTEMPTS = 20;

export class RoomCodesExhaustedError extends Error {
  constructor() {
    super("could not find a free room code");
  }
}

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

export type AuthenticatedPlayer = { session: SessionRecord; player: PlayerRecord };

type ServiceLogger = {
  warn: (details: Record<string, unknown>, message: string) => void;
};

export type SessionServiceDeps = {
  store: SessionStore;
  notifier?: Notifier | undefined;
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
    const setup = parseJson(SessionSetupSchema, json);
    if (json && !setup) log?.warn({ sessionId }, "stored setup failed validation");
    return setup ?? emptySetup();
  };

  const touch = async (session: SessionRecord) => store.touch(session, sessionExpiresAt(session.createdAt, now()));

  const nameSession = async (session: SessionRecord, name: string) => {
    const setup: SessionSetup = { ...emptySetup(), name };
    const summary: LobbySummary = { ...EMPTY_SUMMARY, name };
    try {
      await store.saveSetup(
        session.id,
        JSON.stringify(setup),
        JSON.stringify(summary),
        sessionExpiresAt(session.createdAt, session.createdAt),
      );
    } catch (error) {
      log?.warn({ sessionId: session.id, error }, "could not save the session name");
    }
  };

  const create = async (name = ""): Promise<CreateSessionResponse> => {
    const hostToken = createSecret();
    const createdAt = now();
    const sessionName = name.trim();
    for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt += 1) {
      const session: SessionRecord = {
        id: createId(),
        roomCode: roomCode(),
        status: "lobby",
        hostTokenHash: hashSecret(hostToken),
        createdAt,
      };
      if ((await store.create(session, sessionExpiresAt(createdAt, createdAt))) === "created") {
        if (sessionName) await nameSession(session, sessionName);
        return { sessionId: session.id, roomCode: session.roomCode, hostToken };
      }
    }
    throw new RoomCodesExhaustedError();
  };

  const createNamed = async (name: string): Promise<Result<CreateSessionResponse>> => {
    if (hasHiddenCharacters(name)) return fail("bad_request");
    return { ok: true, value: await create(name) };
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

  const authenticatePlayer = async (
    sessionId: string,
    playerId: string,
    playerToken: string,
  ): Promise<AuthenticatedPlayer | null> => {
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
    { session, player }: AuthenticatedPlayer,
    bytes: Buffer,
  ): Promise<Result<{ version: number }>> => {
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
      session.id,
      player.id,
      { bytes, type: image.type, version },
      sessionExpiresAt(session.createdAt, now()),
    );
    return finishAvatarChange(session, result, { version });
  };

  const setCharacter = async (
    { session, player }: AuthenticatedPlayer,
    character: Character,
  ): Promise<Result<null>> => {
    const result = await store.setCharacter(
      session.id,
      { ...player, character },
      sessionExpiresAt(session.createdAt, now()),
    );
    return finishAvatarChange(session, result, null);
  };

  const removeAvatar = async ({ session, player }: AuthenticatedPlayer): Promise<Result<null>> => {
    const result = await store.removeAvatar(session.id, player.id, sessionExpiresAt(session.createdAt, now()));
    return finishAvatarChange(session, result, null);
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

  const transfer = createSetupTransfer({
    imagesEnabled: media.imagesEnabled,
    getSetup,
    saveSetup,
    readImage: media.readImage,
    hasImageRoom: media.hasImageRoom,
    uploadImage: media.uploadImage,
    discardImages: media.discardImages,
  });

  const lobbyState = async (sessionId: string, connectedPlayerIds: Set<string>): Promise<LobbyState | null> => {
    const [session, players, avatarVersions, summaryJson] = await Promise.all([
      store.findById(sessionId),
      store.listPlayers(sessionId),
      store.avatarVersions(sessionId),
      store.getLobbySummary(sessionId),
    ]);
    if (!session) return null;
    const summary = parseJson(LobbySummarySchema, summaryJson) ?? EMPTY_SUMMARY;
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

  const start = async (sessionId: string): Promise<Result<boolean>> => {
    const session = await store.findById(sessionId);
    if (!session) return fail("room_not_found");
    if (session.status === "finished") return fail("session_ended");
    if (session.status === "playing") return { ok: true, value: false };
    if (!isSetupReady(await readSetup(sessionId))) return fail("setup_incomplete");
    if (!(await store.setStatus(sessionId, "playing"))) return fail("room_not_found");
    await touch(session);
    notifier?.notify(sessionId);
    return { ok: true, value: true };
  };

  const end = async (sessionId: string) => {
    const session = await store.findById(sessionId);
    if (session) await store.deleteSession(session);
  };

  const keepAlive = async (sessionId: string) => {
    const session = await store.findById(sessionId);
    if (!session) return false;
    await touch(session);
    return true;
  };

  return {
    create,
    createNamed,
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
    exportSetup: transfer.exportSetup,
    importSetup: transfer.importSetup,
    lobbyState,
    start,
    end,
    kick,
    isRemoved,
    keepAlive,
    ...media,
  };
};

export type SessionService = ReturnType<typeof createSessionService>;
