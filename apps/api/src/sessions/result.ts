import type { ErrorCode } from "@gamemash/shared";

export type Result<T> = { ok: true; value: T } | { ok: false; error: ErrorCode };

export const fail = (error: ErrorCode): { ok: false; error: ErrorCode } => ({ ok: false, error });
