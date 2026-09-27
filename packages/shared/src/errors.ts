export const ERROR_CODES = ["not_found", "internal_error"] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type ErrorParams = Record<string, string | number>;

export type ApiError = {
  code: ErrorCode;
  params?: ErrorParams;
};

export const errorMessageId = (code: ErrorCode) => `error.${code}` as const;
