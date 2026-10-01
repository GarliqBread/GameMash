import { readFileSync } from "node:fs";
import {
  defaultDrawItConfig,
  type GameSetup,
  type SessionSetup,
  type SetupImportResponse,
  setupImageIds,
} from "@gamemash/games/config";
import type { CreateSessionResponse, UploadImageResponse } from "@gamemash/shared";
import { strToU8, unzipSync, type Zippable, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import type { ImageStore } from "../media/image-store.js";
import { createMemoryImageStore, type MemoryImageStore } from "../media/memory-image-store.js";
import { healthyRedis } from "../test-app.js";
import { createMemorySessionStore } from "./memory-store.js";
import { createSessionService } from "./service.js";
import { createSetupTransfer } from "./setup-transfer.js";
import type { SessionRecord } from "./store.js";
import { readySetup } from "./test-setup.js";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url));

type Options = { withImages?: boolean; maxActiveImages?: number; beforePut?: (count: number) => Promise<void> };

const setup = async ({ withImages = true, maxActiveImages, beforePut }: Options = {}) => {
  const store = createMemorySessionStore();
  const images = createMemoryImageStore();
  let puts = 0;
  const watched: ImageStore = {
    ...images,
    put: async (...args) => {
      puts += 1;
      await beforePut?.(puts);
      return images.put(...args);
    },
  };
  const sessions = createSessionService({ store, images: withImages ? watched : undefined, maxActiveImages });
  const app = buildApp({ redis: healthyRedis, sessions, rateLimit: false });

  const createHost = async () => {
    const session = (await app.inject({ method: "POST", url: "/api/sessions" })).json<CreateSessionResponse>();
    const headers = { authorization: `Bearer ${session.hostToken}` };
    const url = (path: string) => `/api/sessions/${session.sessionId}/${path}`;
    return {
      session,
      uploadImage: async (name: string, type: string) =>
        (
          await app.inject({
            method: "PUT",
            url: url("images"),
            payload: fixture(name),
            headers: { ...headers, "content-type": type },
          })
        ).json<UploadImageResponse>().imageId,
      saveSetup: (body: SessionSetup) => app.inject({ method: "PUT", url: url("setup"), payload: body, headers }),
      loadSetup: async () =>
        (await app.inject({ method: "GET", url: url("setup"), headers })).json<{ setup: SessionSetup }>().setup,
      exportSetup: (token = session.hostToken) =>
        app.inject({ method: "GET", url: url("setup/export"), headers: { authorization: `Bearer ${token}` } }),
      importSetup: (payload: Buffer, contentType = "application/zip") =>
        app.inject({
          method: "POST",
          url: url("setup/import"),
          payload,
          headers: { ...headers, "content-type": contentType },
        }),
    };
  };

  return { app, store, sessions, images: images as MemoryImageStore, createHost };
};

const drawGame: GameSetup = {
  id: "draw-1",
  type: "draw-it",
  config: { ...defaultDrawItConfig("w1"), words: [{ id: "w1", text: "Lighthouse" }] },
};

const quizWith = (images: string[][]): GameSetup => {
  const [game] = readySetup().games;
  if (game?.type !== "pop-quiz") throw new Error("ready setup has no quiz");
  const [question] = game.config.questions;
  if (!question) throw new Error("ready setup has no question");
  const questions = images.map((ids, index) => ({ ...question, id: `q${index + 1}`, images: ids }));
  return { ...game, config: { ...game.config, questions } };
};

const zip = (entries: Record<string, Uint8Array | string>, level: 0 | 6 = 0) =>
  Buffer.from(
    zipSync(
      Object.fromEntries(
        Object.entries(entries).map(([name, value]) => [
          name,
          [typeof value === "string" ? strToU8(value) : value, { level }],
        ]),
      ) as Zippable,
    ),
  );

const setupFile = (setup: SessionSetup, overrides: Record<string, unknown> = {}) =>
  JSON.stringify({ format: "gamemash-setup", version: 1, setup, ...overrides });

describe("setup export and import", () => {
  it("round-trips a lineup with its images into another session", async () => {
    const { createHost, images } = await setup();
    const source = await createHost();
    const photo = await source.uploadImage("photo-256.jpg", "image/jpeg");
    const webp = await source.uploadImage("lossy-256.webp", "image/webp");
    const original: SessionSetup = { name: "Friday mash", games: [quizWith([[photo, webp], [webp]]), drawGame] };
    await source.saveSetup(original);

    const exported = await source.exportSetup();
    expect(exported.statusCode).toBe(200);
    expect(exported.headers["content-type"]).toBe("application/zip");
    expect(Object.keys(unzipSync(new Uint8Array(exported.rawPayload))).toSorted()).toEqual(
      ["setup.json", `images/${photo}.jpg`, `images/${webp}.webp`].toSorted(),
    );

    const target = await createHost();
    const imported = await target.importSetup(exported.rawPayload);

    expect(imported.statusCode).toBe(200);
    const { setup: merged, addedGames } = imported.json<SetupImportResponse>();
    expect(addedGames).toBe(2);
    expect(await target.loadSetup()).toEqual(merged);
    expect(merged.name).toBe("Friday mash");
    const [quiz, draw] = merged.games;
    expect(quiz?.id).not.toBe("quiz-1");
    expect(draw).toMatchObject({ type: "draw-it", config: { words: [{ text: "Lighthouse" }] } });
    if (quiz?.type !== "pop-quiz") throw new Error("expected the quiz first");
    const [first, second] = quiz.config.questions;
    expect(first?.id).not.toBe("q1");
    expect(first?.text).toEqual(
      original.games[0]?.type === "pop-quiz" ? original.games[0].config.questions[0]?.text : null,
    );
    const [newPhoto, newWebp] = first?.images ?? [];
    expect(second?.images).toEqual([newWebp]);
    expect([newPhoto, newWebp]).not.toContain(photo);
    const stored = images.keys().filter((key) => key.includes(target.session.sessionId));
    expect(stored).toHaveLength(2);
  });

  it("adds the games after the current ones and keeps the current name", async () => {
    const { createHost } = await setup();
    const target = await createHost();
    await target.saveSetup({ name: "Team day", games: [drawGame] });

    const response = await target.importSetup(zip({ "setup.json": setupFile({ name: "Other", games: [drawGame] }) }));

    const { setup: merged } = response.json<SetupImportResponse>();
    expect(merged.name).toBe("Team day");
    expect(merged.games).toHaveLength(2);
    expect(merged.games[0]?.id).toBe("draw-1");
    expect(merged.games[1]?.id).not.toBe("draw-1");
  });

  it("refuses to go past the game limit", async () => {
    const { createHost } = await setup();
    const target = await createHost();
    const games = Array.from({ length: 9 }, (_, index) => ({ ...drawGame, id: `draw-${index}` }));
    await target.saveSetup({ name: "", games });

    const response = await target.importSetup(
      zip({ "setup.json": setupFile({ name: "", games: [drawGame, { ...drawGame, id: "draw-2" }] }) }),
    );

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ code: "import_too_many_games", params: { max: 10 } });
  });

  it.each([
    ["something that is not a zip", Buffer.from("hello")],
    ["a zip without setup.json", zip({ "readme.txt": "hi" })],
    ["an unknown format", zip({ "setup.json": setupFile({ name: "", games: [] }, { format: "kahoot" }) })],
    ["a newer version", zip({ "setup.json": setupFile({ name: "", games: [] }, { version: 2 }) })],
    ["broken JSON", zip({ "setup.json": "{" })],
    ["extra fields", zip({ "setup.json": setupFile({ name: "", games: [] }, { author: "me" }) })],
    ["duplicate game ids", zip({ "setup.json": setupFile({ name: "", games: [drawGame, drawGame] }) })],
    ["a hidden character in the name", zip({ "setup.json": setupFile({ name: "a​b", games: [] }) })],
    ["a missing image", zip({ "setup.json": setupFile({ name: "", games: [quizWith([["gone"]])] }) })],
  ])("rejects %s", async (_, file) => {
    const { createHost } = await setup();
    const target = await createHost();

    const response = await target.importSetup(file);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ code: "import_invalid" });
    expect((await target.loadSetup()).games).toEqual([]);
  });

  it("checks imported image bytes and leaves nothing behind when one is bad", async () => {
    const { createHost, images } = await setup();
    const target = await createHost();
    const file = zip({
      "setup.json": setupFile({ name: "", games: [quizWith([["good", "bad"]])] }),
      "images/good.jpg": fixture("photo-256.jpg"),
      "images/bad.webp": strToU8("not an image"),
    });

    const response = await target.importSetup(file);

    expect(response.json()).toEqual({ code: "invalid_image" });
    expect(images.keys()).toEqual([]);
  });

  it("gives back uploaded images when the image limit is hit halfway", async () => {
    const { createHost, images } = await setup({ maxActiveImages: 1 });
    const target = await createHost();
    const file = zip({
      "setup.json": setupFile({ name: "", games: [quizWith([["one", "two"]])] }),
      "images/one.jpg": fixture("photo-256.jpg"),
      "images/two.jpg": fixture("photo-256.jpg"),
    });

    const response = await target.importSetup(file);

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ code: "image_storage_full" });
    expect(images.keys()).toEqual([]);
  });

  it("refuses compressed entries, so a small file can't unpack into something huge", async () => {
    const { createHost } = await setup();
    const target = await createHost();

    const response = await target.importSetup(zip({ "setup.json": setupFile({ name: "", games: [drawGame] }) }, 6));

    expect(response.json()).toEqual({ code: "import_invalid" });
  });

  it("only reads the images the lineup uses", async () => {
    const { createHost } = await setup();
    const target = await createHost();
    const unused = Object.fromEntries(
      Array.from({ length: 160 }, (_, index) => [`images/extra${index}.jpg`, fixture("photo-256.jpg")]),
    );
    const file = zip({
      ...unused,
      "setup.json": setupFile({ name: "", games: [quizWith([["used"]])] }),
      "images/used.jpg": fixture("photo-256.jpg"),
    });

    const response = await target.importSetup(file);

    expect(response.statusCode).toBe(200);
    expect(setupImageIds(response.json<SetupImportResponse>().setup)).toHaveLength(1);
  });

  it("removes uploaded images when storing one of them throws", async () => {
    const { createHost, images, store } = await setup({
      beforePut: async (count) => {
        if (count === 2) throw new Error("disk full");
      },
    });
    const target = await createHost();
    const file = zip({
      "setup.json": setupFile({ name: "", games: [quizWith([["one"], ["two"], ["three"]])] }),
      "images/one.jpg": fixture("photo-256.jpg"),
      "images/two.jpg": fixture("photo-256.jpg"),
      "images/three.jpg": fixture("photo-256.jpg"),
    });

    const response = await target.importSetup(file);

    expect(response.statusCode).toBe(500);
    expect(images.keys()).toEqual([]);
    expect(await store.listImages(target.session.sessionId)).toEqual([]);
    expect((await target.loadSetup()).games).toEqual([]);
  });

  it("keeps changes saved while the images were uploading", async () => {
    const saves: Array<() => Promise<unknown>> = [];
    const { createHost } = await setup({
      beforePut: async () => {
        await saves.shift()?.();
      },
    });
    const target = await createHost();
    saves.push(() => target.saveSetup({ name: "Saved meanwhile", games: [drawGame] }));
    const file = zip({
      "setup.json": setupFile({ name: "From file", games: [quizWith([["one"]])] }),
      "images/one.jpg": fixture("photo-256.jpg"),
    });

    const response = await target.importSetup(file);

    const { setup: merged } = response.json<SetupImportResponse>();
    expect(merged.name).toBe("Saved meanwhile");
    expect(merged.games.map((game) => game.type)).toEqual(["draw-it", "pop-quiz"]);
    expect(await target.loadSetup()).toEqual(merged);
  });

  it("drops images when the server has image storage turned off", async () => {
    const { createHost } = await setup({ withImages: false });
    const target = await createHost();
    const file = zip({ "setup.json": setupFile({ name: "", games: [quizWith([["one"]])] }) });

    const response = await target.importSetup(file);

    expect(response.statusCode).toBe(200);
    expect(setupImageIds(response.json<SetupImportResponse>().setup)).toEqual([]);
  });

  it("refuses to import once the session has started", async () => {
    const { createHost, sessions } = await setup();
    const target = await createHost();
    await target.saveSetup(readySetup());
    await sessions.join(target.session.sessionId, "Priya");
    await sessions.start(target.session.sessionId);

    const response = await target.importSetup(zip({ "setup.json": setupFile({ name: "", games: [drawGame] }) }));

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ code: "setup_locked" });
  });

  it("rejects files over the size limit and other content types", async () => {
    const { createHost } = await setup();
    const target = await createHost();

    expect((await target.importSetup(Buffer.alloc(50 * 1024 * 1024 + 1))).json()).toEqual({
      code: "payload_too_large",
    });
    expect((await target.importSetup(Buffer.from("{}"), "application/json")).statusCode).toBe(415);
  });

  it("only lets the host export", async () => {
    const { createHost } = await setup();
    const target = await createHost();

    expect((await target.exportSetup("wrong")).statusCode).toBe(401);
  });

  it("exports an empty lineup that imports back cleanly", async () => {
    const { createHost } = await setup();
    const source = await createHost();
    const target = await createHost();

    const response = await target.importSetup((await source.exportSetup()).rawPayload);

    expect(response.json()).toEqual({ setup: { name: "", games: [] }, addedGames: 0 });
  });
});

describe("setup export size", () => {
  it("refuses to export images that add up to more than an import accepts", async () => {
    const imageIds = Array.from({ length: 51 }, (_, index) => `img${index}`);
    const transfer = createSetupTransfer({
      imagesEnabled: true,
      getSetup: async () => ({ name: "", games: [quizWith(imageIds.map((imageId) => [imageId]))] }),
      saveSetup: async () => ({ ok: true, value: null }),
      readImage: async () => ({ bytes: Buffer.alloc(1024 * 1024), contentType: "image/jpeg" }),
      hasImageRoom: async () => true,
      uploadImage: async () => ({ ok: false, error: "images_unavailable" }),
      discardImages: async () => {},
    });

    expect(await transfer.exportSetup({ id: "s1" } as SessionRecord)).toEqual({
      ok: false,
      error: "export_too_large",
    });
  });
});
