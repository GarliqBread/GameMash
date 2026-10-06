import type { ImageListResponse, UploadImageResponse } from "@gamemash/shared";
import { ApiRequestError, fetchJson, parseApiError } from "./api";
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

export type UploadProgress = (progress: number) => void;

const proofMediaPath = (sessionId: string) => `/api/sessions/${sessionId}/proof-media`;

const parseBody = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

export const uploadProofMedia = (
  credentials: HostCredentials,
  media: Blob,
  onProgress: UploadProgress,
  signal: AbortSignal,
) =>
  new Promise<UploadImageResponse>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    const settle = (finish: () => void) => {
      signal.removeEventListener("abort", abort);
      finish();
    };
    request.open("PUT", proofMediaPath(credentials.sessionId));
    for (const [name, value] of Object.entries(hostAuthorization(credentials))) request.setRequestHeader(name, value);
    request.setRequestHeader("content-type", media.type);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    });
    request.addEventListener("load", () =>
      settle(() => {
        const body = parseBody(request.responseText);
        if (request.status >= 200 && request.status < 300 && body !== undefined) resolve(body as UploadImageResponse);
        else reject(new ApiRequestError(parseApiError(body), request.status));
      }),
    );
    request.addEventListener("error", () => settle(() => reject(new ApiRequestError({ code: "internal_error" }, 0))));
    request.addEventListener("abort", () => settle(() => reject(signal.reason)));
    signal.addEventListener("abort", abort, { once: true });
    request.send(media);
  });
