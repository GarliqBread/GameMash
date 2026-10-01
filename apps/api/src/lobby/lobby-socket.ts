import type { ClientToServerEvents, ErrorCode, ServerToClientEvents } from "@gamemash/shared";
import type { Server, Socket } from "socket.io";

export type SocketData = {
  sessionId: string;
  member: string;
  role: "host" | "player";
  createdAt: number;
};

export const RATE_LIMITED = "rate_limited" satisfies ErrorCode;
export const INTERNAL_ERROR = "internal_error" satisfies ErrorCode;

export type LobbyServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
export type LobbySocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export const sessionRoom = (sessionId: string) => `session:${sessionId}`;
export const hostRoom = (sessionId: string) => `session:${sessionId}:host`;
export const playerRoom = (sessionId: string, playerId: string) => `session:${sessionId}:player:${playerId}`;
