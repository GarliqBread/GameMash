import { MAX_GAMES } from "@gamemash/games/config";
import {
  type ApiError,
  type ErrorCode,
  type ErrorParams,
  PLAYER_NAME_MAX_LENGTH,
  QUESTION_IMAGES_MAX_PER_SESSION,
  SETUP_IMPORT_MAX_BYTES,
} from "@gamemash/shared";
import type { FastifyReply } from "fastify";
import { BYTES_PER_MB } from "../units.js";

const ERROR_PARAMS: Partial<Record<ErrorCode, ErrorParams>> = {
  invalid_name: { max: PLAYER_NAME_MAX_LENGTH },
  image_limit_reached: { max: QUESTION_IMAGES_MAX_PER_SESSION },
  import_too_many_games: { max: MAX_GAMES },
  export_too_large: { max: SETUP_IMPORT_MAX_BYTES / BYTES_PER_MB },
};

export const errorBody = (code: ErrorCode): ApiError => {
  const params = ERROR_PARAMS[code];
  return params ? { code, params } : { code };
};

type ErrorStatus = 400 | 401 | 404 | 409 | 413 | 415 | 429 | 500 | 503;

const ERROR_STATUS: Partial<Record<ErrorCode, ErrorStatus>> = {
  unauthorized: 401,
  not_found: 404,
  room_not_found: 404,
  name_taken: 409,
  session_full: 409,
  session_ended: 409,
  avatar_locked: 409,
  setup_locked: 409,
  import_too_many_games: 409,
  image_limit_reached: 409,
  input_closed: 409,
  export_too_large: 413,
  payload_too_large: 413,
  unsupported_media_type: 415,
  rate_limited: 429,
  internal_error: 500,
  images_unavailable: 503,
  image_storage_full: 503,
};

const statusOf = (code: ErrorCode): ErrorStatus => ERROR_STATUS[code] ?? 400;

export const sendError = (reply: FastifyReply, code: ErrorCode) => reply.code(statusOf(code)).send(errorBody(code));
