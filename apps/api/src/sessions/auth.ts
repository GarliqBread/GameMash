import type { FastifyInstance, FastifyRequest } from "fastify";
import { clientKey } from "../limits/client-key.js";
import { createRateLimiter } from "../limits/rate-limiter.js";
import { bearerToken } from "./bearer.js";
import type { SessionService } from "./service.js";
import type { PlayerRecord, SessionRecord } from "./store.js";

const MINUTE_MS = 60_000;

export const sessionRateLimitKey = (request: FastifyRequest) => {
  const { sessionId } = request.params as { sessionId?: unknown };
  return `${clientKey(request.ip)}:${typeof sessionId === "string" ? sessionId : ""}`;
};

export const requireHost = (app: FastifyInstance, sessions: SessionService, requestsPerAddressPerMinute: number) => {
  const requests = createRateLimiter({ max: requestsPerAddressPerMinute, windowMs: MINUTE_MS });
  const hosts = new WeakMap<FastifyRequest, SessionRecord>();

  app.addHook("onRequest", async (request, reply) => {
    if (!requests.hit(clientKey(request.ip))) return reply.code(429).send({ code: "rate_limited" });
    const token = bearerToken(request.headers.authorization);
    const { sessionId } = request.params as { sessionId?: unknown };
    const session = token && typeof sessionId === "string" ? await sessions.authenticateHost(sessionId, token) : null;
    if (!session) return reply.code(401).send({ code: "unauthorized" });
    hosts.set(request, session);
  });

  return (request: FastifyRequest) => {
    const session = hosts.get(request);
    if (!session) throw new Error("host route reached without an authenticated host");
    return session;
  };
};

export type AuthenticatedPlayer = { session: SessionRecord; player: PlayerRecord };

export const requirePlayer = (app: FastifyInstance, sessions: SessionService, requestsPerAddressPerMinute: number) => {
  const requests = createRateLimiter({ max: requestsPerAddressPerMinute, windowMs: MINUTE_MS });
  const players = new WeakMap<FastifyRequest, AuthenticatedPlayer>();

  app.addHook("onRequest", async (request, reply) => {
    if (!requests.hit(clientKey(request.ip))) return reply.code(429).send({ code: "rate_limited" });
    const token = bearerToken(request.headers.authorization);
    const { sessionId, playerId } = request.params as { sessionId?: unknown; playerId?: unknown };
    const found =
      token && typeof sessionId === "string" && typeof playerId === "string"
        ? await sessions.authenticatePlayer(sessionId, playerId, token)
        : null;
    if (!found) return reply.code(401).send({ code: "unauthorized" });
    players.set(request, found);
  });

  return (request: FastifyRequest) => {
    const found = players.get(request);
    if (!found) throw new Error("player route reached without an authenticated player");
    return found;
  };
};
