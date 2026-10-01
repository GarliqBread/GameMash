import { MS_PER_MINUTE } from "@gamemash/shared";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { clientKey } from "../limits/client-key.js";
import { createRateLimiter } from "../limits/rate-limiter.js";
import { routeParam } from "../limits/route-limits.js";
import { bearerToken } from "./bearer.js";
import { sendError } from "./error-body.js";
import type { AuthenticatedPlayer, SessionService } from "./service.js";
import type { SessionRecord } from "./store.js";

type Authenticate<T> = (sessions: SessionService, request: FastifyRequest, token: string) => Promise<T | null>;

const requireAuth =
  <T>(authenticate: Authenticate<T>, missing: string) =>
  (app: FastifyInstance, sessions: SessionService, requestsPerAddressPerMinute: number) => {
    const requests = createRateLimiter({ max: requestsPerAddressPerMinute, windowMs: MS_PER_MINUTE });
    const authenticated = new WeakMap<FastifyRequest, T>();

    app.addHook("onRequest", async (request, reply) => {
      if (!requests.hit(clientKey(request.ip))) return sendError(reply, "rate_limited");
      const token = bearerToken(request.headers.authorization);
      const found = token ? await authenticate(sessions, request, token) : null;
      if (!found) return sendError(reply, "unauthorized");
      authenticated.set(request, found);
    });

    return (request: FastifyRequest) => {
      const found = authenticated.get(request);
      if (!found) throw new Error(missing);
      return found;
    };
  };

export const requireHost = requireAuth<SessionRecord>((sessions, request, token) => {
  const sessionId = routeParam(request, "sessionId");
  return sessionId ? sessions.authenticateHost(sessionId, token) : Promise.resolve(null);
}, "host route reached without an authenticated host");

export const requirePlayer = requireAuth<AuthenticatedPlayer>((sessions, request, token) => {
  const sessionId = routeParam(request, "sessionId");
  const playerId = routeParam(request, "playerId");
  return sessionId && playerId ? sessions.authenticatePlayer(sessionId, playerId, token) : Promise.resolve(null);
}, "player route reached without an authenticated player");
