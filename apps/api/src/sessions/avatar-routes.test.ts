import { readFileSync } from "node:fs";
import {
  AVATAR_MAX_BYTES,
  type Character,
  type CreateSessionResponse,
  type JoinSessionResponse,
} from "@gamemash/shared";
import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { healthyRedis } from "../test-app.js";
import { createMemorySessionStore } from "./memory-store.js";
import { createSessionService } from "./service.js";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url));

const setup = async () => {
  const store = createMemorySessionStore();
  const sessions = createSessionService({ store });
  const app = buildApp({ redis: healthyRedis, sessions, rateLimit: false });
  const session = (await app.inject({ method: "POST", url: "/api/sessions" })).json<CreateSessionResponse>();
  const join = async (name: string) =>
    (
      await app.inject({ method: "POST", url: `/api/sessions/${session.sessionId}/players`, payload: { name } })
    ).json<JoinSessionResponse>();
  const priya = await join("Priya");
  const url = (playerId = priya.playerId) => `/api/sessions/${session.sessionId}/players/${playerId}/avatar`;
  const upload = (payload: Buffer, contentType: string, token: string | null = priya.playerToken, playerId?: string) =>
    app.inject({
      method: "PUT",
      url: url(playerId),
      payload,
      headers: { "content-type": contentType, ...(token && { authorization: `Bearer ${token}` }) },
    });
  const bearer = (token: string | null) => (token ? { authorization: `Bearer ${token}` } : {});
  const saveCharacter = (payload: unknown, token: string | null = priya.playerToken) =>
    app.inject({
      method: "PUT",
      url: `/api/sessions/${session.sessionId}/players/${priya.playerId}/character`,
      payload: payload as Record<string, unknown>,
      headers: bearer(token),
    });
  const removePhoto = (token: string | null = priya.playerToken) =>
    app.inject({ method: "DELETE", url: url(), headers: bearer(token) });
  const priyaInLobby = async () =>
    (await sessions.lobbyState(session.sessionId, new Set()))?.players.find((player) => player.id === priya.playerId);
  const start = () => store.setStatus(session.sessionId, "playing");
  return { app, sessions, session, priya, join, url, upload, saveCharacter, removePhoto, priyaInLobby, start };
};

describe("avatar upload", () => {
  it.each([
    ["lossy-256.webp", "image/webp"],
    ["photo-256.jpg", "image/jpeg"],
  ])("stores %s and serves exactly the same bytes without caching", async (name, type) => {
    const { app, url, upload } = await setup();
    const bytes = fixture(name);

    const response = await upload(bytes, type);
    const served = await app.inject({ method: "GET", url: url() });

    expect(response.statusCode).toBe(200);
    expect(response.json().avatarVersion).toEqual(expect.any(Number));
    expect(served.statusCode).toBe(200);
    expect(served.rawPayload.equals(bytes)).toBe(true);
    expect(served.headers["content-type"]).toBe(type);
    expect(served.headers["cache-control"]).toBe("no-store");
    expect(served.headers["x-content-type-options"]).toBe("nosniff");
    expect(served.headers["content-security-policy"]).toBe("default-src 'none'; sandbox");
  });

  it("shows the avatar version in the lobby state", async () => {
    const { sessions, session, priya, upload } = await setup();

    const { avatarVersion } = (await upload(fixture("lossy-256.webp"), "image/webp")).json();
    const state = await sessions.lobbyState(session.sessionId, new Set());

    expect(state?.players.find((player) => player.id === priya.playerId)?.avatarVersion).toBe(avatarVersion);
  });

  it("requires the player's own token", async () => {
    const { join, upload } = await setup();
    const daan = await join("Daan");
    const bytes = fixture("lossy-256.webp");

    expect((await upload(bytes, "image/webp", null)).json()).toEqual({ code: "unauthorized" });
    expect((await upload(bytes, "image/webp", "wrong")).statusCode).toBe(401);
    expect((await upload(bytes, "image/webp", daan.playerToken)).statusCode).toBe(401);
  });

  it("accepts the bearer scheme in any case", async () => {
    const { app, url, priya } = await setup();

    const response = await app.inject({
      method: "PUT",
      url: url(),
      payload: fixture("lossy-256.webp"),
      headers: { "content-type": "image/webp", authorization: `bearer ${priya.playerToken}` },
    });

    expect(response.statusCode).toBe(200);
  });

  it("rejects an upload without a body as an unsupported media type", async () => {
    const { app, url, priya } = await setup();

    const response = await app.inject({
      method: "PUT",
      url: url(),
      headers: { authorization: `Bearer ${priya.playerToken}` },
    });

    expect(response.statusCode).toBe(415);
    expect(response.json()).toEqual({ code: "unsupported_media_type" });
  });

  it("rejects file types other than WebP and JPEG", async () => {
    const { upload } = await setup();

    const response = await upload(fixture("not-allowed.png"), "image/png");

    expect(response.statusCode).toBe(415);
    expect(response.json()).toEqual({ code: "unsupported_media_type" });
  });

  it("checks the actual bytes instead of trusting the content type", async () => {
    const { upload } = await setup();

    const response = await upload(fixture("not-allowed.png"), "image/webp");

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ code: "invalid_image" });
  });

  it("rejects images with oversized dimensions, even when the file is small", async () => {
    const { upload } = await setup();

    const response = await upload(fixture("huge-4000x10.jpg"), "image/jpeg");

    expect(response.json()).toEqual({ code: "invalid_image" });
  });

  it("rejects files larger than 32 KB", async () => {
    const { upload } = await setup();
    const tooBig = Buffer.concat([fixture("lossy-256.webp"), Buffer.alloc(AVATAR_MAX_BYTES)]);

    const response = await upload(tooBig, "image/webp");

    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual({ code: "payload_too_large" });
  });

  it("returns not_found for a player without an avatar", async () => {
    const { app, url } = await setup();

    const response = await app.inject({ method: "GET", url: url() });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ code: "not_found" });
  });
});

const CHARACTER: Character = { head: 1, eyes: 2, nose: 3, mouth: 4, top: 5, topColor: 0, beard: null, mustache: 2 };

describe("changing the look in the lobby", () => {
  it("saves a character, which replaces the photo", async () => {
    const { upload, saveCharacter, priyaInLobby } = await setup();
    await upload(fixture("lossy-256.webp"), "image/webp");

    const response = await saveCharacter(CHARACTER);

    expect(response.statusCode).toBe(204);
    expect(await priyaInLobby()).toMatchObject({ character: CHARACTER, avatarVersion: null });
  });

  it.each([
    ["an unknown part", { ...CHARACTER, hat: 1 }],
    ["a part the style doesn't have", { ...CHARACTER, top: 29 }],
    ["a missing part", { ...CHARACTER, eyes: undefined }],
  ])("rejects a character with %s", async (_label, payload) => {
    const { saveCharacter, priyaInLobby } = await setup();
    const before = await priyaInLobby();

    const response = await saveCharacter(payload);

    expect(response.statusCode).toBe(400);
    expect(await priyaInLobby()).toEqual(before);
  });

  it("removes the photo so the character shows again", async () => {
    const { app, url, upload, removePhoto, priyaInLobby } = await setup();
    await upload(fixture("lossy-256.webp"), "image/webp");

    const response = await removePhoto();

    expect(response.statusCode).toBe(204);
    expect((await priyaInLobby())?.avatarVersion).toBeNull();
    expect((await app.inject({ method: "GET", url: url() })).statusCode).toBe(404);
  });

  it("requires the player's own token", async () => {
    const { join, saveCharacter, removePhoto } = await setup();
    const daan = await join("Daan");

    expect((await saveCharacter(CHARACTER, null)).statusCode).toBe(401);
    expect((await saveCharacter(CHARACTER, daan.playerToken)).json()).toEqual({ code: "unauthorized" });
    expect((await removePhoto(daan.playerToken)).statusCode).toBe(401);
  });

  it("locks the photo and character once the session has started", async () => {
    const { upload, saveCharacter, removePhoto, priyaInLobby, start } = await setup();
    await upload(fixture("lossy-256.webp"), "image/webp");
    const before = await priyaInLobby();
    await start();

    for (const response of [
      await upload(fixture("photo-256.jpg"), "image/jpeg"),
      await saveCharacter(CHARACTER),
      await removePhoto(),
    ]) {
      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({ code: "avatar_locked" });
    }
    expect(await priyaInLobby()).toEqual(before);
  });
});
