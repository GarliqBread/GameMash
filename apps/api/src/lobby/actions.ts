import type { ErrorCode, SocketAck } from "@gamemash/shared";
import { GameInputPayloadSchema, GameNextPayloadSchema, KickPlayerPayloadSchema } from "@gamemash/shared/schemas";
import type { FastifyBaseLogger } from "fastify";
import type { Static, TSchema } from "typebox";
import { Value } from "typebox/value";
import type { GameRunner } from "../game/runner.js";
import type { RateLimiter } from "../limits/rate-limiter.js";
import { errorBody } from "../sessions/error-body.js";
import type { SessionService } from "../sessions/service.js";
import {
  INTERNAL_ERROR,
  type LobbyServer,
  type LobbySocket,
  playerRoom,
  RATE_LIMITED,
  type SocketData,
} from "./lobby-socket.js";
import type { Presence } from "./presence.js";

type ActionOptions = { role: SocketData["role"]; limiter: RateLimiter; failure: string };

const rejected = (code: ErrorCode): SocketAck => ({ ok: false, error: errorBody(code) });

const unauthorized = rejected("unauthorized");
const rateLimited = rejected(RATE_LIMITED);
const badRequest = rejected("bad_request");
const internalError = rejected(INTERNAL_ERROR);
const accepted: SocketAck = { ok: true };

const replyTo = (ack: unknown) => (result: SocketAck) => {
  if (typeof ack === "function") ack(result);
};

export type LobbyActionDeps = {
  io: LobbyServer;
  log: FastifyBaseLogger;
  sessions: SessionService;
  game: GameRunner;
  presence: Presence;
  sessionActions: RateLimiter;
  gameActions: RateLimiter;
  scheduleBroadcast: (sessionId: string) => void;
  endSession: (sessionId: string) => void;
};

export const createLobbyActions = ({
  io,
  log,
  sessions,
  game,
  presence,
  sessionActions,
  gameActions,
  scheduleBroadcast,
  endSession,
}: LobbyActionDeps) => {
  const guard = async (
    socket: LobbySocket,
    { role, limiter, failure }: ActionOptions,
    run: () => Promise<SocketAck>,
  ): Promise<SocketAck> => {
    if (socket.data.role !== role) return unauthorized;
    if (!limiter.hit(socket.id)) return rateLimited;
    try {
      return await run();
    } catch (error) {
      log.error({ err: error, sessionId: socket.data.sessionId }, failure);
      return internalError;
    }
  };

  const action = (socket: LobbySocket, options: ActionOptions, run: () => Promise<SocketAck>) => async (ack: unknown) =>
    replyTo(ack)(await guard(socket, options, run));

  const payloadAction =
    <S extends TSchema>(
      socket: LobbySocket,
      options: ActionOptions,
      schema: S,
      run: (payload: Static<S>) => Promise<SocketAck>,
    ) =>
    async (payload: unknown, ack: unknown) =>
      replyTo(ack)(
        await guard(socket, options, async () => (Value.Check(schema, payload) ? run(payload) : badRequest)),
      );

  const hostSessionAction: Omit<ActionOptions, "failure"> = { role: "host", limiter: sessionActions };
  const hostGameAction: Omit<ActionOptions, "failure"> = { role: "host", limiter: gameActions };

  const startSession = async (sessionId: string): Promise<SocketAck> => {
    const result = await sessions.start(sessionId);
    if (!result.ok) return rejected(result.error);
    return (await game.begin(sessionId, result.value)) ? accepted : internalError;
  };

  const resetSession = async (sessionId: string): Promise<SocketAck> => {
    if (!(await game.reset(sessionId))) return rejected("game_not_finished");
    scheduleBroadcast(sessionId);
    return accepted;
  };

  const closeSession = async (sessionId: string): Promise<SocketAck> => {
    await sessions.end(sessionId);
    setImmediate(() => endSession(sessionId));
    return accepted;
  };

  const kickPlayer = async (sessionId: string, playerId: string): Promise<SocketAck> => {
    const result = await sessions.kick(sessionId, playerId);
    if (!result.ok) return rejected(result.error);
    const room = playerRoom(sessionId, playerId);
    io.to(room).emit("player:removed");
    io.in(room).disconnectSockets(true);
    return accepted;
  };

  const advanceGame = async (sessionId: string, phaseId: number): Promise<SocketAck> => {
    await game.next(sessionId, phaseId);
    return accepted;
  };

  const submitInput = async (
    sessionId: string,
    playerId: string,
    phaseId: number,
    input: unknown,
  ): Promise<SocketAck> => {
    const result = await game.submit(sessionId, playerId, phaseId, input, presence.connectedPlayers(sessionId));
    if (result === "accepted") return accepted;
    return { ok: false, error: { code: result === "duplicate" ? "already_submitted" : "input_closed" } };
  };

  return (socket: LobbySocket) => {
    const { sessionId, member } = socket.data;
    socket.on(
      "session:start",
      action(socket, { ...hostSessionAction, failure: "failed to start session" }, () => startSession(sessionId)),
    );
    socket.on(
      "session:reset",
      action(socket, { ...hostSessionAction, failure: "failed to reset session" }, () => resetSession(sessionId)),
    );
    socket.on(
      "session:end",
      action(socket, { ...hostSessionAction, failure: "failed to end session" }, () => closeSession(sessionId)),
    );
    socket.on(
      "player:kick",
      payloadAction(
        socket,
        { ...hostGameAction, failure: "failed to remove player" },
        KickPlayerPayloadSchema,
        ({ playerId }) => kickPlayer(sessionId, playerId),
      ),
    );
    socket.on(
      "game:next",
      payloadAction(
        socket,
        { ...hostGameAction, failure: "failed to advance game" },
        GameNextPayloadSchema,
        ({ phaseId }) => advanceGame(sessionId, phaseId),
      ),
    );
    socket.on(
      "game:input",
      payloadAction(
        socket,
        { role: "player", limiter: gameActions, failure: "failed to submit game input" },
        GameInputPayloadSchema,
        ({ phaseId, input }) => submitInput(sessionId, member, phaseId, input),
      ),
    );
  };
};
