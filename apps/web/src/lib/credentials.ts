import type { HandshakeAuth } from "@gamemash/shared";

export type HostCredentials = {
  role: "host";
  sessionId: string;
  hostToken: string;
  roomCode: string;
};

export type PlayerCredentials = {
  role: "player";
  sessionId: string;
  playerId: string;
  playerToken: string;
  name: string;
};

export type Credentials = HostCredentials | PlayerCredentials;

export const hostAuthorization = (credentials: HostCredentials) => ({
  authorization: `Bearer ${credentials.hostToken}`,
});

const remembered = new Map<string, Credentials>();

const storageKey = (role: Credentials["role"], sessionId: string) => `gamemash:${role}:${sessionId}`;

const readStored = (key: string): unknown => {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const hasStrings = (value: Record<string, unknown>, keys: string[]) =>
  keys.every((key) => typeof value[key] === "string");

const load = (role: Credentials["role"], sessionId: string, keys: string[]) => {
  const key = storageKey(role, sessionId);
  const value = remembered.get(key) ?? readStored(key);
  return isRecord(value) && value.role === role && value.sessionId === sessionId && hasStrings(value, keys)
    ? value
    : null;
};

export const loadHostCredentials = (sessionId: string) =>
  load("host", sessionId, ["hostToken", "roomCode"]) as HostCredentials | null;

export const loadPlayerCredentials = (sessionId: string) =>
  load("player", sessionId, ["playerId", "playerToken", "name"]) as PlayerCredentials | null;

export const saveCredentials = (credentials: Credentials) => {
  const key = storageKey(credentials.role, credentials.sessionId);
  remembered.set(key, credentials);
  try {
    window.sessionStorage.setItem(key, JSON.stringify(credentials));
  } catch {
    return;
  }
};

export const clearCredentials = (credentials: Credentials) => {
  const key = storageKey(credentials.role, credentials.sessionId);
  remembered.delete(key);
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    return;
  }
};

export const toHandshakeAuth = (credentials: Credentials): HandshakeAuth =>
  credentials.role === "host"
    ? { role: "host", sessionId: credentials.sessionId, hostToken: credentials.hostToken }
    : {
        role: "player",
        sessionId: credentials.sessionId,
        playerId: credentials.playerId,
        playerToken: credentials.playerToken,
      };
