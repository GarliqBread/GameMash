import { readFileSync } from "node:fs";
import {
  type CreateSessionResponse,
  PROOF_PHOTO_MAX_BYTES,
  PROOF_VIDEO_MAX_BYTES,
  type UploadImageResponse,
} from "@gamemash/shared";
import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { createMemoryImageStore } from "../media/memory-image-store.js";
import { healthyRedis } from "../test-app.js";
import { createMemorySessionStore } from "./memory-store.js";
import { createSessionService } from "./service.js";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url));

const SOF0 = Buffer.from([0xff, 0xc0]);

const jpegWithWidth = (width: number) => {
  const bytes = Buffer.from(fixture("huge-4000x10.jpg"));
  bytes.writeUInt16BE(width, bytes.indexOf(SOF0) + 7);
  return bytes;
};

const setup = async ({ withImages = true } = {}) => {
  const images = createMemoryImageStore();
  const sessions = createSessionService({ store: createMemorySessionStore(), images: withImages ? images : undefined });
  const app = buildApp({ redis: healthyRedis, sessions, rateLimit: false });
  const session = (await app.inject({ method: "POST", url: "/api/sessions" })).json<CreateSessionResponse>();
  const send = (path: string, payload: Buffer, contentType: string, token: string | null = session.hostToken) =>
    app.inject({
      method: "PUT",
      url: `/api/sessions/${session.sessionId}/${path}`,
      payload,
      headers: { "content-type": contentType, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    });
  const upload = (payload: Buffer, contentType: string, token?: string | null) =>
    send("proof-media", payload, contentType, token);
  return { images, upload, send };
};

describe("proof media upload", () => {
  it.each([
    ["proof-320x180.mp4", "video/mp4"],
    ["dot-1x1.gif", "image/gif"],
    ["photo-256.jpg", "image/jpeg"],
    ["lossy-256.webp", "image/webp"],
  ])("stores %s", async (name, type) => {
    const { images, upload } = await setup();

    const response = await upload(fixture(name), type);

    expect(response.statusCode).toBe(200);
    expect(images.read(response.json<UploadImageResponse>().url)).toEqual({ bytes: fixture(name), contentType: type });
  });

  it("takes photos up to 2560 px, which question images don't", async () => {
    const { upload, send } = await setup();

    expect((await upload(jpegWithWidth(2560), "image/jpeg")).statusCode).toBe(200);
    expect((await upload(jpegWithWidth(2561), "image/jpeg")).json()).toEqual({ code: "invalid_image" });
    expect((await send("images", jpegWithWidth(2560), "image/jpeg")).json()).toEqual({ code: "invalid_image" });
  });

  it("keeps GIFs and videos out of question images", async () => {
    const { send } = await setup();

    expect((await send("images", fixture("dot-1x1.gif"), "image/gif")).statusCode).toBe(415);
    expect((await send("images", fixture("proof-320x180.mp4"), "video/mp4")).statusCode).toBe(415);
  });

  it.each([
    ["bigger than 720p", "proof-1920x1080.mp4"],
    ["longer than 2 minutes", "proof-125s.mp4"],
    ["not AAC audio", "proof-opus.mp4"],
    ["really a photo", "photo-256.jpg"],
  ])("rejects a video that is %s", async (_case, name) => {
    const { upload } = await setup();

    const response = await upload(fixture(name), "video/mp4");

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ code: "invalid_image" });
  });

  it("checks the actual bytes of a GIF", async () => {
    const { upload } = await setup();

    expect((await upload(fixture("photo-256.jpg"), "image/gif")).json()).toEqual({ code: "invalid_image" });
  });

  it("refuses files over the video limit before reading them", async () => {
    const { upload } = await setup();

    const response = await upload(Buffer.alloc(PROOF_VIDEO_MAX_BYTES + 1), "video/mp4");

    expect(response.statusCode).toBe(413);
  });

  it("refuses other content types and oversized declared lengths before reading the body", async () => {
    const { upload } = await setup();

    expect((await upload(Buffer.from("{}"), "application/json")).statusCode).toBe(415);
    const tooBigPhoto = await upload(Buffer.alloc(PROOF_PHOTO_MAX_BYTES + 1), "image/jpeg");
    expect(tooBigPhoto.statusCode).toBe(413);
    expect(tooBigPhoto.json()).toEqual({ code: "payload_too_large" });
  });

  it("only lets the host upload", async () => {
    const { upload } = await setup();

    expect((await upload(fixture("proof-320x180.mp4"), "video/mp4", null)).statusCode).toBe(401);
    expect((await upload(fixture("proof-320x180.mp4"), "video/mp4", "wrong-token")).statusCode).toBe(401);
  });

  it("says so when the server has image storage turned off", async () => {
    const { upload } = await setup({ withImages: false });

    expect((await upload(fixture("proof-320x180.mp4"), "video/mp4")).json()).toEqual({ code: "images_unavailable" });
  });
});
