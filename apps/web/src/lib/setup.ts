import type { HostSetupResponse, SessionSetup, SetupImportResponse } from "@gamemash/games/config";
import { SETUP_FILE_CONTENT_TYPE, SETUP_FILE_EXTENSION } from "@gamemash/shared";
import { fetchJson, responseError } from "./api";
import { type HostCredentials, hostAuthorization } from "./credentials";

const FALLBACK_FILE_NAME = "gamemash-lineup";
const REVOKE_DELAY_MS = 1000;

const setupPath = (sessionId: string) => `/api/sessions/${sessionId}/setup`;

export const fetchSetup = (credentials: HostCredentials) =>
  fetchJson<HostSetupResponse>(setupPath(credentials.sessionId), { headers: hostAuthorization(credentials) });

export const saveSetup = (credentials: HostCredentials, setup: SessionSetup) =>
  fetchJson<undefined>(setupPath(credentials.sessionId), {
    method: "PUT",
    headers: { ...hostAuthorization(credentials), "content-type": "application/json" },
    body: JSON.stringify(setup),
  });

export const exportSetupFile = async (credentials: HostCredentials) => {
  const response = await fetch(`${setupPath(credentials.sessionId)}/export`, {
    headers: hostAuthorization(credentials),
  });
  if (!response.ok) throw await responseError(response);
  return response.blob();
};

const fileNameOf = (sessionName: string) => {
  const slug = sessionName
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || FALLBACK_FILE_NAME}.${SETUP_FILE_EXTENSION}`;
};

const download = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
};

export const downloadSetupFile = async (credentials: HostCredentials, sessionName: string) =>
  download(await exportSetupFile(credentials), fileNameOf(sessionName));

export const importSetupFile = (credentials: HostCredentials, file: Blob) =>
  fetchJson<SetupImportResponse>(`${setupPath(credentials.sessionId)}/import`, {
    method: "POST",
    headers: { ...hostAuthorization(credentials), "content-type": SETUP_FILE_CONTENT_TYPE },
    body: file,
  });
