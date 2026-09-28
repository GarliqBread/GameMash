import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CreateSessionResponse, UploadImageResponse } from "@gamemash/shared";
import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import type { RedisHealth } from "../redis.js";
import { createMemorySessionStore } from "../sessions/memory-store.js";
import { createSessionService } from "../sessions/service.js";
import { createDiskImageStore } from "./disk-image-store.js";

const redis = { ping: async () => "PONG", isReady: true } as unknown as RedisHealth;
const photo = readFileSync(new URL("../sessions/fixtures/photo-256.jpg", import.meta.url));

const setup = async () => {
  const imageFiles = createDiskImageStore({
    directory: await mkdtemp(join(tmpdir(), "gamemash-routes-")),
    minFreeBytes: 1,
  });
  const sessions = createSessionService({ store: createMemorySessionStore(), images: imageFiles });
  const app = buildApp({ redis, sessions, imageFiles, rateLimit: false });
  const session = (await app.inject({ method: "POST", url: "/api/sessions" })).json<CreateSessionResponse>();
  const upload = async () =>
    (
      await app.inject({
        method: "PUT",
        url: `/api/sessions/${session.sessionId}/images`,
        payload: photo,
        headers: { "content-type": "image/jpeg", authorization: `Bearer ${session.hostToken}` },
      })
    ).json<UploadImageResponse>();
  return { app, sessions, session, upload };
};

describe("images stored on disk", () => {
  it("serves an uploaded image from its URL with safe headers", async () => {
    const { app, upload } = await setup();
    const { url } = await upload();

    const response = await app.inject({ method: "GET", url });

    expect(response.statusCode).toBe(200);
    expect(response.rawPayload).toEqual(photo);
    expect(response.headers).toMatchObject({
      "content-type": "image/jpeg",
      "cache-control": "private, max-age=21600, immutable",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
    });
  });

  it("stops serving images once the session's images are deleted", async () => {
    const { app, sessions, session, upload } = await setup();
    const { url } = await upload();

    await sessions.deleteImages(session.sessionId);

    expect((await app.inject({ method: "GET", url })).statusCode).toBe(404);
  });

  it("rejects paths that are not plain ids", async () => {
    const { app, session } = await setup();

    const response = await app.inject({ method: "GET", url: `/api/images/${session.sessionId}/..%2F..%2Fsecret` });

    expect(response.statusCode).toBe(400);
  });
});
