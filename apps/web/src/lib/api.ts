import { type ApiError, type ErrorParams, isErrorCode } from "@gamemash/shared";

const NO_CONTENT = 204;

export class ApiRequestError extends Error {
  constructor(
    public error: ApiError,
    public status: number,
  ) {
    super(error.code);
  }
}

const isParamValue = (value: unknown) => typeof value === "string" || typeof value === "number";

const toParams = (value: unknown): ErrorParams | undefined => {
  if (typeof value !== "object" || value === null) return undefined;
  const entries = Object.entries(value);
  return entries.every(([, entry]) => isParamValue(entry)) ? (Object.fromEntries(entries) as ErrorParams) : undefined;
};

const toApiError = (body: unknown): ApiError => {
  if (typeof body !== "object" || body === null || !("code" in body) || !isErrorCode(body.code)) {
    return { code: "internal_error" };
  }
  const params = "params" in body ? toParams(body.params) : undefined;
  return params ? { code: body.code, params } : { code: body.code };
};

const parseJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
};

export const responseError = async (response: Response) =>
  new ApiRequestError(toApiError(await parseJson(response)), response.status);

export const fetchJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, init);
  if (response.status === NO_CONTENT) return undefined as T;
  const body = await parseJson(response);
  if (!response.ok) throw new ApiRequestError(toApiError(body), response.status);
  if (body === undefined) throw new ApiRequestError({ code: "internal_error" }, response.status);
  return body as T;
};
