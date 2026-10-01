import { MS_PER_SECOND, SESSION_IDLE_TTL_SECONDS, SESSION_MAX_AGE_SECONDS } from "@gamemash/shared";

export const sessionDeadline = (createdAt: number) => createdAt + SESSION_MAX_AGE_SECONDS * MS_PER_SECOND;

export const sessionExpiresAt = (createdAt: number, now: number) =>
  Math.min(now + SESSION_IDLE_TTL_SECONDS * MS_PER_SECOND, sessionDeadline(createdAt));
