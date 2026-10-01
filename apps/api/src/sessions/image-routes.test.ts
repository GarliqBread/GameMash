import { readFileSync } from "node:fs";
import {
  type CreateSessionResponse,
  type ImageListResponse,
  QUESTION_IMAGE_MAX_BYTES,
  QUESTION_IMAGES_MAX_PER_SESSION,
  type UploadImageResponse,
} from "@gamemash/shared";
import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import type { ImageStore } from "../media/image-store.js";
import { createMemoryImageStore, type MemoryImageStore } from "../media/memory-image-store.js";
import { healthyRedis } from "../test-app.js";
import { createMemorySessionStore } from "./memory-store.js";
import { createSessionService } from "./service.js";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url));

type SetupOptions = {
  images?: ImageStore;
  withImages?: boolean;
  maxActiveImages?: number;
};

const setup = async ({ images = createMemoryImageStore(), withImages = true, maxActiveImages }: SetupOptions = {}) => {
  const store = createMemorySessionStore();
  const sessions = createSessionService({ store, images: withImages ? images : undefined, maxActiveImages });
  const app = buildApp({ redis: healthyRedis, sessions, rateLimit: false });
  const session = (await app.inject({ method: "POST", url: "/api/sessions" })).json<CreateSessionResponse>();
  const url = `/api/sessions/${session.sessionId}/images`;
  const auth = (token: string | null) => (token ? { authorization: `Bearer ${token}` } : {});
  const upload = (payload: Buffer, contentType: string, token: string | null = session.hostToken) =>
    app.inject({ method: "PUT", url, payload, headers: { "content-type": contentType, ...auth(token) } });
  const list = (token: string | null = session.hostToken) => app.inject({ method: "GET", url, headers: auth(token) });
  return { app, store, sessions, session, images: images as MemoryImageStore, upload, list };
};

describe("question image upload", () => {
  it.each([
    ["lossy-256.webp", "image/webp"],
    ["lossless-200x100.webp", "image/webp"],
    ["photo-256.jpg", "image/jpeg"],
  ])("stores %s and returns a URL that serves it", async (name, type) => {
    const { images, upload } = await setup();

    const response = await upload(fixture(name), type);

    expect(response.statusCode).toBe(200);
    const body = response.json<UploadImageResponse>();
    expect(body.imageId).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(images.read(body.url)).toEqual({ bytes: fixture(name), contentType: type });
  });

  it("lists every uploaded image with a URL", async () => {
    const { images, upload, list } = await setup();
    const first = (await upload(fixture("photo-256.jpg"), "image/jpeg")).json<UploadImageResponse>();
    const second = (await upload(fixture("lossy-256.webp"), "image/webp")).json<UploadImageResponse>();

    const response = await list();

    expect(response.statusCode).toBe(200);
    const { images: listed } = response.json<ImageListResponse>();
    expect(listed.map((image) => image.id).toSorted()).toEqual([first.imageId, second.imageId].toSorted());
    expect(listed.every((image) => images.read(image.url) !== null)).toBe(true);
  });

  it("rejects file types other than WebP and JPEG", async () => {
    const { upload } = await setup();

    const response = await upload(fixture("not-allowed.png"), "image/png");

    expect(response.statusCode).toBe(415);
    expect(response.json()).toEqual({ code: "unsupported_media_type" });
  });

  it.each([
    ["bytes that are not an image", Buffer.from("not an image at all"), "image/jpeg"],
    ["a type that doesn't match the bytes", fixture("lossy-256.webp"), "image/jpeg"],
    ["an image larger than the maximum dimension", fixture("huge-4000x10.jpg"), "image/jpeg"],
  ])("rejects %s", async (_label, bytes, type) => {
    const { upload, list } = await setup();

    const response = await upload(bytes, type);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ code: "invalid_image" });
    expect((await list()).json()).toEqual({ images: [] });
  });

  it("rejects files above the size limit", async () => {
    const { upload } = await setup();
    const bytes = Buffer.concat([fixture("photo-256.jpg"), Buffer.alloc(QUESTION_IMAGE_MAX_BYTES)]);

    const response = await upload(bytes, "image/jpeg");

    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual({ code: "payload_too_large" });
  });

  it("stops at the image limit of a session", async () => {
    const { store, session, upload } = await setup();
    for (let index = 0; index < QUESTION_IMAGES_MAX_PER_SESSION; index += 1) {
      await store.addImage(session.sessionId, `image-${index}`, {
        maxPerSession: QUESTION_IMAGES_MAX_PER_SESSION,
        maxActive: 1000,
        uploadedAt: Date.now(),
        expiresAt: Date.now() + 60_000,
        leaseUntil: Date.now() + 60_000,
      });
    }

    const response = await upload(fixture("photo-256.jpg"), "image/jpeg");

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ code: "image_limit_reached", params: { max: QUESTION_IMAGES_MAX_PER_SESSION } });
  });

  it("only lets the host upload or list images", async () => {
    const { upload, list } = await setup();

    for (const token of [null, "wrong-token"]) {
      const uploaded = await upload(fixture("photo-256.jpg"), "image/jpeg", token);
      const listed = await list(token);
      expect(uploaded.statusCode).toBe(401);
      expect(uploaded.json()).toEqual({ code: "unauthorized" });
      expect(listed.statusCode).toBe(401);
    }
  });

  it("refuses uploads once the session has started", async () => {
    const { store, session, images, upload } = await setup();
    await store.setStatus(session.sessionId, "playing");

    const response = await upload(fixture("photo-256.jpg"), "image/jpeg");

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ code: "setup_locked" });
    expect(images.keys()).toEqual([]);
  });

  it("reports images as unavailable when no storage is configured", async () => {
    const { app, session, upload, list } = await setup({ withImages: false });

    const uploaded = await upload(fixture("photo-256.jpg"), "image/jpeg");
    const listed = await list();
    const setupResponse = await app.inject({
      method: "GET",
      url: `/api/sessions/${session.sessionId}/setup`,
      headers: { authorization: `Bearer ${session.hostToken}` },
    });

    expect(uploaded.statusCode).toBe(503);
    expect(uploaded.json()).toEqual({ code: "images_unavailable" });
    expect(listed.statusCode).toBe(503);
    expect(listed.json()).toEqual({ code: "images_unavailable" });
    expect(setupResponse.json()).toMatchObject({ imagesEnabled: false });
  });

  it("forgets an image whose upload to storage failed", async () => {
    const failing: ImageStore = {
      ...createMemoryImageStore(),
      put: async () => {
        throw new Error("storage is down");
      },
    };
    const { upload, list } = await setup({ images: failing });

    const response = await upload(fixture("photo-256.jpg"), "image/jpeg");

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ code: "internal_error" });
    expect((await list()).json()).toEqual({ images: [] });
  });
});

describe("server-wide image limits", () => {
  it("pauses uploads while the disk is almost full", async () => {
    const { upload } = await setup({ images: { ...createMemoryImageStore(), hasRoom: async () => false } });

    const response = await upload(fixture("photo-256.jpg"), "image/jpeg");

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ code: "image_storage_full" });
  });

  it("pauses uploads once the server holds its maximum, and frees slots when a session ends", async () => {
    const images = createMemoryImageStore();
    const store = createMemorySessionStore();
    const sessions = createSessionService({ store, images, maxActiveImages: 1 });
    const first = await store.findById((await sessions.create()).sessionId);
    const second = await store.findById((await sessions.create()).sessionId);
    if (!first || !second) throw new Error("sessions were not created");

    expect((await sessions.uploadImage(first, fixture("photo-256.jpg"), "image/jpeg")).ok).toBe(true);
    expect(await sessions.uploadImage(second, fixture("photo-256.jpg"), "image/jpeg")).toEqual({
      ok: false,
      error: "image_storage_full",
    });

    await sessions.deleteImages(first.id);

    expect((await sessions.uploadImage(second, fixture("photo-256.jpg"), "image/jpeg")).ok).toBe(true);
  });

  it("sweeps away images of sessions that no longer exist and keeps the rest", async () => {
    const images = createMemoryImageStore();
    const store = createMemorySessionStore();
    const sessions = createSessionService({ store, images });
    const live = await store.findById((await sessions.create()).sessionId);
    if (!live) throw new Error("session was not created");
    await sessions.uploadImage(live, fixture("photo-256.jpg"), "image/jpeg");
    await images.put("ended-session", "orphan", fixture("photo-256.jpg"), "image/jpeg");

    expect(await sessions.sweepImages()).toBe(1);
    expect(await images.listSessionIds()).toEqual([live.id]);
  });
});

describe("question image ownership", () => {
  it("confirms only images uploaded to the same session", async () => {
    const { sessions, session, upload } = await setup();
    const other = await setup();
    const { imageId } = (await upload(fixture("photo-256.jpg"), "image/jpeg")).json<UploadImageResponse>();
    const foreign = (await other.upload(fixture("photo-256.jpg"), "image/jpeg")).json<UploadImageResponse>();

    expect(await sessions.hasImages(session.sessionId, [])).toBe(true);
    expect(await sessions.hasImages(session.sessionId, [imageId])).toBe(true);
    expect(await sessions.hasImages(session.sessionId, [imageId, foreign.imageId])).toBe(false);
    expect(await sessions.hasImages(session.sessionId, ["made-up"])).toBe(false);
  });
});
