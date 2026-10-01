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

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

export const hostAuthorization = ({ hostToken }: HostCredentials) => bearer(hostToken);

export const playerAuthorization = ({ playerToken }: PlayerCredentials) => bearer(playerToken);

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

const isCredentials = <T extends Credentials>(
  value: unknown,
  role: T["role"],
  sessionId: string,
  keys: (keyof T & string)[],
): value is T => isRecord(value) && value.role === role && value.sessionId === sessionId && hasStrings(value, keys);

const load = <T extends Credentials>(role: T["role"], sessionId: string, keys: (keyof T & string)[]) => {
  const key = storageKey(role, sessionId);
  const value = remembered.get(key) ?? readStored(key);
  return isCredentials<T>(value, role, sessionId, keys) ? value : null;
};

export const loadHostCredentials = (sessionId: string) =>
  load<HostCredentials>("host", sessionId, ["hostToken", "roomCode"]);

export const loadPlayerCredentials = (sessionId: string) =>
  load<PlayerCredentials>("player", sessionId, ["playerId", "playerToken", "name"]);

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
