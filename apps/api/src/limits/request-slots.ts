import type { FastifyInstance, FastifyRequest } from "fastify";
import { sendError } from "../sessions/error-body.js";
import { clientKey } from "./client-key.js";

export type RequestSlotLimits = { max: number; perClient: number };

export const limitRequestsAtOnce = (app: FastifyInstance, { max, perClient }: RequestSlotLimits) => {
  let active = 0;
  const byClient = new Map<string, number>();
  const holding = new WeakMap<FastifyRequest, string>();

  const release = async (request: FastifyRequest) => {
    const key = holding.get(request);
    if (key === undefined) return;
    holding.delete(request);
    active -= 1;
    const count = (byClient.get(key) ?? 1) - 1;
    if (count > 0) byClient.set(key, count);
    else byClient.delete(key);
  };

  app.addHook("onRequest", async (request, reply) => {
    const key = clientKey(request.ip);
    if (active >= max || (byClient.get(key) ?? 0) >= perClient) return sendError(reply, "rate_limited");
    active += 1;
    byClient.set(key, (byClient.get(key) ?? 0) + 1);
    holding.set(request, key);
  });
  app.addHook("onResponse", release);
  app.addHook("onRequestAbort", release);
};
