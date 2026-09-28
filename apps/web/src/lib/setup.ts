import type { HostSetupResponse, SessionSetup } from "@gamemash/games/config";
import { fetchJson } from "./api";
import { type HostCredentials, hostAuthorization } from "./credentials";

const setupPath = (sessionId: string) => `/api/sessions/${sessionId}/setup`;

export const fetchSetup = (credentials: HostCredentials) =>
  fetchJson<HostSetupResponse>(setupPath(credentials.sessionId), { headers: hostAuthorization(credentials) });

export const saveSetup = (credentials: HostCredentials, setup: SessionSetup) =>
  fetchJson<undefined>(setupPath(credentials.sessionId), {
    method: "PUT",
    headers: { ...hostAuthorization(credentials), "content-type": "application/json" },
    body: JSON.stringify(setup),
  });
