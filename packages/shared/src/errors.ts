export const ERROR_CODES = [
  "bad_request",
  "not_found",
  "room_not_found",
  "invalid_name",
  "name_taken",
  "session_full",
  "session_ended",
  "unauthorized",
  "rate_limited",
  "invalid_image",
  "avatar_locked",
  "kick_locked",
  "setup_locked",
  "setup_incomplete",
  "payload_too_large",
  "unsupported_media_type",
  "input_closed",
  "already_submitted",
  "images_unavailable",
  "image_limit_reached",
  "image_storage_full",
  "internal_error",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type ErrorParams = Record<string, string | number>;

export type ApiError = {
  code: ErrorCode;
  params?: ErrorParams;
};

export const isErrorCode = (value: unknown): value is ErrorCode => ERROR_CODES.some((code) => code === value);

export const errorMessageId = (code: ErrorCode) => `error.${code}` as const;
