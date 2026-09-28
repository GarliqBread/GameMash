import {
  type ClientToServerEvents,
  type GameSnapshot,
  type LobbyState,
  type ServerToClientEvents,
  SOCKET_AUTH_ERROR,
  type SocketAck,
} from "@gamemash/shared";
import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { create } from "zustand";
import { type Credentials, clearCredentials, toHandshakeAuth } from "./credentials";

type LobbySocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type LobbyStatus = "connecting" | "connected" | "reconnecting" | "ended";

type LobbyStore = {
  status: LobbyStatus;
  state: LobbyState | null;
  game: GameSnapshot | null;
  clockOffset: number;
  socket: LobbySocket | null;
};

const INITIAL_STORE: LobbyStore = { status: "connecting", state: null, game: null, clockOffset: 0, socket: null };
const RETRY_MS = 3000;
const ACK_TIMEOUT_MS = 5000;

const failed: SocketAck = { ok: false, error: { code: "internal_error" } };

export const useLobbyStore = create<LobbyStore>(() => INITIAL_STORE);

const setStatus = (status: LobbyStatus) =>
  useLobbyStore.setState((store) => (store.status === "ended" ? store : { status }));

const receiveGame = (game: GameSnapshot) => useLobbyStore.setState({ game, clockOffset: game.serverNow - Date.now() });

const connectLobby = (credentials: Credentials) => {
  const socket: LobbySocket = io({ auth: toHandshakeAuth(credentials), autoConnect: false });
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const end = () => {
    clearCredentials(credentials);
    useLobbyStore.setState({ status: "ended" });
  };

  socket.on("connect", () => setStatus("connected"));
  socket.on("disconnect", (reason) => {
    if (reason === "io server disconnect") return end();
    if (reason !== "io client disconnect") setStatus("reconnecting");
  });
  socket.on("connect_error", (error) => {
    if (error.message === SOCKET_AUTH_ERROR) return end();
    setStatus("reconnecting");
    if (!socket.active) retryTimer = setTimeout(() => socket.connect(), RETRY_MS);
  });
  socket.on("lobby:state", (state) => useLobbyStore.setState({ state }));
  socket.on("game:state", receiveGame);
  socket.on("session:ended", end);
  useLobbyStore.setState({ socket });
  socket.connect();

  return () => {
    clearTimeout(retryTimer);
    socket.removeAllListeners();
    socket.disconnect();
    useLobbyStore.setState(INITIAL_STORE);
  };
};

export const useLobbyConnection = (credentials: Credentials) => {
  useEffect(() => connectLobby(credentials), [credentials]);
};

const send = async (request: (socket: LobbySocket) => Promise<SocketAck>): Promise<SocketAck> => {
  const { socket } = useLobbyStore.getState();
  if (!socket?.connected) return failed;
  try {
    return await request(socket);
  } catch {
    return failed;
  }
};

export const startSession = () => send((socket) => socket.timeout(ACK_TIMEOUT_MS).emitWithAck("session:start"));

export const nextPhase = (phaseId: number) =>
  send((socket) => socket.timeout(ACK_TIMEOUT_MS).emitWithAck("game:next", { phaseId }));

export const submitInput = (phaseId: number, input: unknown) =>
  send((socket) => socket.timeout(ACK_TIMEOUT_MS).emitWithAck("game:input", { phaseId, input }));
