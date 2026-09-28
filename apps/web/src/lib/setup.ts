import type { SessionSetup } from "@gamemash/games/config";
import { fetchJson } from "./api";
import type { HostCredentials } from "./credentials";

const setupPath = (sessionId: string) => `/api/sessions/${sessionId}/setup`;

const authorization = (credentials: HostCredentials) => ({ authorization: `Bearer ${credentials.hostToken}` });

export const fetchSetup = (credentials: HostCredentials) =>
  fetchJson<SessionSetup>(setupPath(credentials.sessionId), { headers: authorization(credentials) });

export const saveSetup = (credentials: HostCredentials, setup: SessionSetup) =>
  fetchJson<undefined>(setupPath(credentials.sessionId), {
    method: "PUT",
    headers: { ...authorization(credentials), "content-type": "application/json" },
    body: JSON.stringify(setup),
  });
