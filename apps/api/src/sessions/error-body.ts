import { MAX_GAMES } from "@gamemash/games/config";
import {
  type ApiError,
  type ErrorCode,
  type ErrorParams,
  QUESTION_IMAGES_MAX_PER_SESSION,
  SETUP_IMPORT_MAX_BYTES,
} from "@gamemash/shared";

const BYTES_PER_MB = 1024 * 1024;

const ERROR_PARAMS: Partial<Record<ErrorCode, ErrorParams>> = {
  image_limit_reached: { max: QUESTION_IMAGES_MAX_PER_SESSION },
  import_too_many_games: { max: MAX_GAMES },
  export_too_large: { max: SETUP_IMPORT_MAX_BYTES / BYTES_PER_MB },
};

export const errorBody = (code: ErrorCode): ApiError => {
  const params = ERROR_PARAMS[code];
  return params ? { code, params } : { code };
};
