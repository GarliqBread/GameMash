import type { ImageListResponse, UploadImageResponse } from "@gamemash/shared";
import { fetchJson } from "./api";
import { type HostCredentials, hostAuthorization } from "./credentials";

const imagesPath = (sessionId: string) => `/api/sessions/${sessionId}/images`;

export const fetchImages = (credentials: HostCredentials) =>
  fetchJson<ImageListResponse>(imagesPath(credentials.sessionId), { headers: hostAuthorization(credentials) });

export const uploadImage = (credentials: HostCredentials, image: Blob) =>
  fetchJson<UploadImageResponse>(imagesPath(credentials.sessionId), {
    method: "PUT",
    headers: { ...hostAuthorization(credentials), "content-type": image.type },
    body: image,
  });
