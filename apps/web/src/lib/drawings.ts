import type { DrawingUpload } from "@gamemash/games/schemas";
import type { Drawing } from "@gamemash/ui";
import { ApiRequestError, fetchJson } from "./api";
import { type HostCredentials, hostAuthorization, type PlayerCredentials, playerAuthorization } from "./credentials";

const NOT_FOUND = 404;

const playerUrl = ({ sessionId, playerId }: PlayerCredentials, path: string) =>
  `/api/sessions/${sessionId}/players/${playerId}/game/${path}`;

const orNull = async (request: Promise<Drawing | undefined>) => {
  try {
    return (await request) ?? null;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === NOT_FOUND) return null;
    throw error;
  }
};

export const uploadDrawing = (credentials: PlayerCredentials, phaseId: number, upload: DrawingUpload) =>
  fetchJson<void>(playerUrl(credentials, "upload"), {
    method: "PUT",
    headers: { "content-type": "application/json", ...playerAuthorization(credentials) },
    body: JSON.stringify({ phaseId, upload }),
  });

export const fetchPlayerDrawing = (credentials: PlayerCredentials, drawingId: string) =>
  orNull(
    fetchJson<Drawing | undefined>(playerUrl(credentials, `uploads/${encodeURIComponent(drawingId)}`), {
      headers: playerAuthorization(credentials),
    }),
  );

export const fetchHostDrawing = (credentials: HostCredentials, drawingId: string) =>
  orNull(
    fetchJson<Drawing | undefined>(
      `/api/sessions/${credentials.sessionId}/game/uploads/${encodeURIComponent(drawingId)}`,
      {
        headers: hostAuthorization(credentials),
      },
    ),
  );
