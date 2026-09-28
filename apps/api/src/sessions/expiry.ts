import { SESSION_IDLE_TTL_SECONDS, SESSION_MAX_AGE_SECONDS } from "@gamemash/shared";

const MS_PER_SECOND = 1000;

export const sessionExpiresAt = (createdAt: number, now: number) =>
  Math.min(now + SESSION_IDLE_TTL_SECONDS * MS_PER_SECOND, createdAt + SESSION_MAX_AGE_SECONDS * MS_PER_SECOND);
