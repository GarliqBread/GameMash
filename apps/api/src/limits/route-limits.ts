import { MS_PER_MINUTE } from "@gamemash/shared";
import type { FastifyRequest } from "fastify";
import { clientKey } from "./client-key.js";

type KeyGenerator = (request: FastifyRequest) => string;

export const routeParam = (request: FastifyRequest, name: string) => {
  const value = (request.params as Record<string, unknown>)[name];
  return typeof value === "string" ? value : "";
};

export const byClient: KeyGenerator = (request) => clientKey(request.ip);

export const byClientAndParam =
  (name: string): KeyGenerator =>
  (request) =>
    `${clientKey(request.ip)}:${routeParam(request, name)}`;

export const sessionRateLimitKey = byClientAndParam("sessionId");

export const perMinute = (max: number, keyGenerator: KeyGenerator) => ({
  rateLimit: { max, timeWindow: MS_PER_MINUTE, keyGenerator },
});

export const perSession = (max: number) => perMinute(max, sessionRateLimitKey);
