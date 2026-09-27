import type { ApiError } from "@gamemash/shared";

export class ApiRequestError extends Error {
  constructor(
    public error: ApiError,
    public status: number,
  ) {
    super(error.code);
  }
}

const isApiError = (value: unknown): value is ApiError =>
  typeof value === "object" && value !== null && "code" in value && typeof value.code === "string";

export const fetchJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, init);
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiRequestError(isApiError(body) ? body : { code: "internal_error" }, response.status);
  }
  return body as T;
};
