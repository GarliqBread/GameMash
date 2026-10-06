import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CreateSessionResponse, UploadImageResponse } from "@gamemash/shared";
import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { createMemorySessionStore } from "../sessions/memory-store.js";
import { createSessionService } from "../sessions/service.js";
import { healthyRedis } from "../test-app.js";
import { createDiskImageStore } from "./disk-image-store.js";

const photo = readFileSync(new URL("../sessions/fixtures/photo-256.jpg", import.meta.url));
const video = readFileSync(new URL("../sessions/fixtures/proof-320x180.mp4", import.meta.url));

const setup = async () => {
  const imageFiles = createDiskImageStore({
    directory: await mkdtemp(join(tmpdir(), "gamemash-routes-")),
    minFreeBytes: 1,
  });
  const sessions = createSessionService({ store: createMemorySessionStore(), images: imageFiles });
  const app = buildApp({ redis: healthyRedis, sessions, imageFiles, rateLimit: false });
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
  const uploadVideo = async () =>
    (
      await app.inject({
        method: "PUT",
        url: `/api/sessions/${session.sessionId}/proof-media`,
        payload: video,
        headers: { "content-type": "video/mp4", authorization: `Bearer ${session.hostToken}` },
      })
    ).json<UploadImageResponse>();
  return { app, sessions, session, upload, uploadVideo };
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

  it("serves proof videos in parts, so browsers can seek and Safari can play them", async () => {
    const { app, uploadVideo } = await setup();
    const { url } = await uploadVideo();

    const whole = await app.inject({ method: "GET", url });
    const part = await app.inject({ method: "GET", url, headers: { range: "bytes=100-199" } });
    const tail = await app.inject({ method: "GET", url, headers: { range: "bytes=-10" } });

    expect(whole.statusCode).toBe(200);
    expect(whole.rawPayload).toEqual(video);
    expect(whole.headers).toMatchObject({
      "content-type": "video/mp4",
      "accept-ranges": "bytes",
      "content-length": String(video.length),
    });
    expect(part.statusCode).toBe(206);
    expect(part.rawPayload).toEqual(video.subarray(100, 200));
    expect(part.headers).toMatchObject({
      "content-range": `bytes 100-199/${video.length}`,
      "content-length": "100",
      "x-content-type-options": "nosniff",
    });
    expect(tail.rawPayload).toEqual(video.subarray(video.length - 10));
  });

  it("refuses a range past the end of the file", async () => {
    const { app, uploadVideo } = await setup();
    const { url } = await uploadVideo();

    const response = await app.inject({ method: "GET", url, headers: { range: `bytes=${video.length}-` } });

    expect(response.statusCode).toBe(416);
    expect(response.headers["content-range"]).toBe(`bytes */${video.length}`);
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
