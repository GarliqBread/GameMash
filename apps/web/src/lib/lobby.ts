import {
  type ClientToServerEvents,
  type LobbyState,
  type ServerToClientEvents,
  SOCKET_AUTH_ERROR,
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
};

const INITIAL_STORE: LobbyStore = { status: "connecting", state: null };
const RETRY_MS = 3000;

export const useLobbyStore = create<LobbyStore>(() => INITIAL_STORE);

const setStatus = (status: LobbyStatus) =>
  useLobbyStore.setState((store) => (store.status === "ended" ? store : { status }));

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
  socket.on("session:ended", end);
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
