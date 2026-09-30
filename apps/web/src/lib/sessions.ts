import type { CreateSessionResponse, JoinSessionResponse, RoomLookupResponse } from "@gamemash/shared";
import { fetchJson } from "./api";

export const createSession = (name: string) =>
  fetchJson<CreateSessionResponse>("/api/sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(name.trim() ? { name } : {}),
  });

export const lookupRoom = (code: string) =>
  fetchJson<RoomLookupResponse>(`/api/sessions/by-code/${encodeURIComponent(code)}`);

export const joinSession = (sessionId: string, name: string) =>
  fetchJson<JoinSessionResponse>(`/api/sessions/${sessionId}/players`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
