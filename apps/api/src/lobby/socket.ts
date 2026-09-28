import type { Server as HttpServer, IncomingMessage } from "node:http";
import {
  type ClientToServerEvents,
  SESSION_MAX_AGE_SECONDS,
  type ServerToClientEvents,
  SOCKET_AUTH_ERROR,
  type SocketAck,
} from "@gamemash/shared";
import { HandshakeAuthSchema } from "@gamemash/shared/schemas";
import type { FastifyBaseLogger } from "fastify";
import proxyAddr from "proxy-addr";
import { Server, type Socket } from "socket.io";
import { Value } from "typebox/value";
import { clientKey } from "../limits/client-key.js";
import { createRateLimiter } from "../limits/rate-limiter.js";
import type { SessionService } from "../sessions/service.js";
import type { LobbyNotifier } from "./notifier.js";
import { createPresence, HOST_MEMBER } from "./presence.js";

type SocketData = {
  sessionId: string;
  member: string;
  role: "host" | "player";
  createdAt: number;
};

type LobbyServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type LobbySocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export type LobbyLimits = {
  handshakesPerAddressPerMinute: number;
  connectionsPerPlayer: number;
  connectionsPerHost: number;
  startsPerSocketPerMinute: number;
};

export const DEFAULT_LOBBY_LIMITS: LobbyLimits = {
  handshakesPerAddressPerMinute: 600,
  connectionsPerPlayer: 3,
  connectionsPerHost: 5,
  startsPerSocketPerMinute: 10,
};

const MINUTE_MS = 60_000;
const MAX_MESSAGE_BYTES = 4 * 1024;
const BROADCAST_DELAY_MS = 100;
const DEFAULT_KEEP_ALIVE_MS = 5 * MINUTE_MS;

const RATE_LIMITED = "rate_limited";
const INTERNAL_ERROR = "internal_error";
const CONNECTION_CLOSED = "connection_closed";

const sessionRoom = (sessionId: string) => `session:${sessionId}`;

const unauthorized: SocketAck = { ok: false, error: { code: "unauthorized" } };
const rateLimited: SocketAck = { ok: false, error: { code: "rate_limited" } };

const authenticate = async (sessions: SessionService, auth: unknown): Promise<SocketData | null> => {
  if (!Value.Check(HandshakeAuthSchema, auth)) return null;
  if (auth.role === "host") {
    const session = await sessions.authenticateHost(auth.sessionId, auth.hostToken);
    return session ? { sessionId: session.id, role: "host", member: HOST_MEMBER, createdAt: session.createdAt } : null;
  }
  const match = await sessions.authenticatePlayer(auth.sessionId, auth.playerId, auth.playerToken);
  return match
    ? { sessionId: match.session.id, role: "player", member: match.player.id, createdAt: match.session.createdAt }
    : null;
};

export type LobbyDeps = {
  log: FastifyBaseLogger;
  sessions: SessionService;
  notifier: LobbyNotifier;
  trustProxy?: string[] | undefined;
  limits?: Partial<LobbyLimits> | undefined;
  keepAliveMs?: number | undefined;
  now?: (() => number) | undefined;
};

export const attachLobby = (
  httpServer: HttpServer,
  { log, sessions, notifier, trustProxy = [], limits, keepAliveMs = DEFAULT_KEEP_ALIVE_MS, now = Date.now }: LobbyDeps,
) => {
  const { handshakesPerAddressPerMinute, connectionsPerPlayer, connectionsPerHost, startsPerSocketPerMinute } = {
    ...DEFAULT_LOBBY_LIMITS,
    ...limits,
  };
  const io: LobbyServer = new Server(httpServer, { serveClient: false, maxHttpBufferSize: MAX_MESSAGE_BYTES });
  const presence = createPresence();
  const handshakes = createRateLimiter({ max: handshakesPerAddressPerMinute, windowMs: MINUTE_MS });
  const starts = createRateLimiter({ max: startsPerSocketPerMinute, windowMs: MINUTE_MS });
  const trusted = proxyAddr.compile(trustProxy);
  const pendingBroadcasts = new Map<string, NodeJS.Timeout>();
  const lastStates = new Map<string, string>();
  const deadlines = new Map<string, NodeJS.Timeout>();
  const releases = new WeakMap<LobbySocket, () => void>();

  const addressOf = (request: IncomingMessage) => clientKey(proxyAddr(request, trusted));

  const forgetSession = (sessionId: string) => {
    clearTimeout(pendingBroadcasts.get(sessionId));
    pendingBroadcasts.delete(sessionId);
    clearTimeout(deadlines.get(sessionId));
    deadlines.delete(sessionId);
    lastStates.delete(sessionId);
    presence.forget(sessionId);
  };

  const releaseSlot = (sessionId: string, member: string) => {
    presence.disconnect(sessionId, member);
    if (presence.has(sessionId)) scheduleBroadcast(sessionId);
    else forgetSession(sessionId);
  };

  const reserveSlot = (socket: LobbySocket, { sessionId, member }: SocketData) => {
    presence.connect(sessionId, member);
    let isReleased = false;
    const release = () => {
      if (isReleased) return;
      isReleased = true;
      socket.conn.off("close", release);
      releaseSlot(sessionId, member);
    };
    socket.conn.once("close", release);
    return release;
  };

  const endSession = (sessionId: string) => {
    io.to(sessionRoom(sessionId)).emit("session:ended");
    io.in(sessionRoom(sessionId)).disconnectSockets(true);
    forgetSession(sessionId);
  };

  const broadcast = async (sessionId: string) => {
    pendingBroadcasts.delete(sessionId);
    try {
      const state = await sessions.lobbyState(sessionId, presence.connectedPlayers(sessionId));
      if (!state) return endSession(sessionId);
      const serialized = JSON.stringify(state);
      if (lastStates.get(sessionId) === serialized) return;
      lastStates.set(sessionId, serialized);
      io.to(sessionRoom(sessionId)).emit("lobby:state", state);
    } catch (error) {
      log.error({ err: error, sessionId }, "failed to broadcast lobby state");
    }
  };

  const scheduleBroadcast = (sessionId: string) => {
    if (!presence.has(sessionId) || pendingBroadcasts.has(sessionId)) return;
    pendingBroadcasts.set(
      sessionId,
      setTimeout(() => void broadcast(sessionId), BROADCAST_DELAY_MS),
    );
  };

  const scheduleDeadline = (sessionId: string, createdAt: number) => {
    if (deadlines.has(sessionId)) return;
    const remaining = Math.max(0, createdAt + SESSION_MAX_AGE_SECONDS * 1000 - now());
    const timer = setTimeout(() => endSession(sessionId), remaining);
    timer.unref();
    deadlines.set(sessionId, timer);
  };

  const sendState = async (socket: LobbySocket) => {
    const { sessionId } = socket.data;
    const state = await sessions.lobbyState(sessionId, presence.connectedPlayers(sessionId));
    if (state) socket.emit("lobby:state", state);
  };

  const keepAlive = async () => {
    for (const sessionId of presence.sessions()) {
      try {
        if (!(await sessions.keepAlive(sessionId))) endSession(sessionId);
      } catch (error) {
        log.error({ err: error, sessionId }, "failed to keep session alive");
      }
    }
  };

  const unsubscribe = notifier.subscribe(scheduleBroadcast);
  const keepAliveTimer = setInterval(() => void keepAlive(), keepAliveMs);
  keepAliveTimer.unref();

  io.use(async (socket, next) => {
    if (!handshakes.hit(addressOf(socket.request))) return next(new Error(RATE_LIMITED));
    try {
      const data = await authenticate(sessions, socket.handshake.auth);
      if (!data) return next(new Error(SOCKET_AUTH_ERROR));
      const cap = data.role === "host" ? connectionsPerHost : connectionsPerPlayer;
      if (presence.count(data.sessionId, data.member) >= cap) return next(new Error(RATE_LIMITED));
      if (socket.conn.readyState !== "open") return next(new Error(CONNECTION_CLOSED));
      socket.data = data;
      releases.set(socket, reserveSlot(socket, data));
      return next();
    } catch (error) {
      log.error({ err: error }, "socket authentication failed");
      return next(new Error(INTERNAL_ERROR));
    }
  });

  const handleStart = (socket: LobbySocket) => async (ack: unknown) => {
    const reply = (result: SocketAck) => {
      if (typeof ack === "function") ack(result);
    };
    if (socket.data.role !== "host") return reply(unauthorized);
    if (!starts.hit(socket.id)) return reply(rateLimited);
    try {
      const result = await sessions.start(socket.data.sessionId);
      return reply(result.ok ? { ok: true } : { ok: false, error: { code: result.error } });
    } catch (error) {
      log.error({ err: error }, "failed to start session");
      return reply({ ok: false, error: { code: "internal_error" } });
    }
  };

  io.on("connection", (socket) => {
    const { sessionId, createdAt } = socket.data;
    void socket.join(sessionRoom(sessionId));
    scheduleDeadline(sessionId, createdAt);
    void sendState(socket).catch((error: unknown) => log.error({ err: error, sessionId }, "failed to send state"));
    scheduleBroadcast(sessionId);

    socket.on("session:start", handleStart(socket));

    socket.on("disconnect", () => {
      releases.get(socket)?.();
      releases.delete(socket);
    });
  });

  const close = async () => {
    unsubscribe();
    clearInterval(keepAliveTimer);
    for (const timer of [...pendingBroadcasts.values(), ...deadlines.values()]) clearTimeout(timer);
    pendingBroadcasts.clear();
    deadlines.clear();
    await io.close();
  };

  return { io, close };
};

export type Lobby = ReturnType<typeof attachLobby>;
