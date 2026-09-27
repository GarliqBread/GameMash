import { io } from "socket.io-client";
import { create } from "zustand";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

type SocketState = {
  status: ConnectionStatus;
};

export const useSocketStore = create<SocketState>(() => ({ status: "connecting" }));

export const socket = io({ autoConnect: false });

socket.on("connect", () => useSocketStore.setState({ status: "connected" }));
socket.on("disconnect", () => useSocketStore.setState({ status: "disconnected" }));
