import { randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { QuestionImageContentType } from "@gamemash/shared";
import { describe, expect, it } from "vitest";
import { createDiskImageStore, DISK_IMAGE_PATH } from "./disk-image-store.js";
import { createImageId, type ImageStore } from "./image-store.js";
import { createMemoryImageStore } from "./memory-image-store.js";
import { createS3ImageStore } from "./s3-image-store.js";
import { connectTestS3 } from "./test-s3.js";

type Downloaded = { bytes: Buffer; contentType: string } | null;

type Harness = {
  store: ImageStore;
  download: (url: string) => Promise<Downloaded>;
};

const s3 = await connectTestS3();

const fetchImage = async (url: string): Promise<Downloaded> => {
  const response = await fetch(url);
  if (!response.ok) return null;
  return { bytes: Buffer.from(await response.arrayBuffer()), contentType: response.headers.get("content-type") ?? "" };
};

const memoryHarness = (): Harness => {
  const store = createMemoryImageStore();
  return { store, download: async (url) => store.read(url) };
};

const diskDirectory = await mkdtemp(join(tmpdir(), "gamemash-images-"));

const diskHarness = (): Harness => {
  const store = createDiskImageStore({ directory: diskDirectory, minFreeBytes: 1 });
  return {
    store,
    download: async (url) => {
      const [sessionId = "", imageId = ""] = url.slice(DISK_IMAGE_PATH.length + 1).split("/");
      return store.get(sessionId, imageId);
    },
  };
};

const harnesses: [string, (() => Harness) | undefined][] = [
  ["memory", memoryHarness],
  ["disk", diskHarness],
  ["s3", s3 ? () => ({ store: createS3ImageStore(s3, { pageSize: 2 }), download: fetchImage }) : undefined],
];

const bytes = (seed: number) => Buffer.from([0xff, 0xd8, 0xff, seed, seed + 1, seed + 2]);

describe.each(harnesses)("%s image store", (_name, makeHarness) => {
  const run = makeHarness ? it : it.skip;
  const harness = () => makeHarness?.() as Harness;

  const upload = async (store: ImageStore, sessionId: string, seed: number, type: QuestionImageContentType) => {
    const imageId = createImageId();
    await store.put(sessionId, imageId, bytes(seed), type);
    return imageId;
  };

  run("serves a stored image through its presigned URL", async () => {
    const { store, download } = harness();
    const sessionId = randomUUID();
    const imageId = await upload(store, sessionId, 1, "image/webp");

    const url = await store.presignedUrl(sessionId, imageId);

    expect(await download(url)).toEqual({ bytes: bytes(1), contentType: "image/webp" });
  });

  run("reads a stored image back, and nothing for an unknown one", async () => {
    const { store } = harness();
    const sessionId = randomUUID();
    const imageId = await upload(store, sessionId, 7, "image/jpeg");

    expect(await store.get(sessionId, imageId)).toEqual({ bytes: bytes(7), contentType: "image/jpeg" });
    expect(await store.get(sessionId, createImageId())).toBeNull();
    await store.deleteSession(sessionId);
  });

  run("deletes every image of a session and leaves other sessions alone", async () => {
    const { store, download } = harness();
    const sessionId = randomUUID();
    const otherSessionId = randomUUID();
    const ids = [
      await upload(store, sessionId, 1, "image/jpeg"),
      await upload(store, sessionId, 2, "image/webp"),
      await upload(store, sessionId, 3, "image/jpeg"),
      await upload(store, sessionId, 4, "image/jpeg"),
      await upload(store, sessionId, 5, "image/jpeg"),
    ];
    const otherId = await upload(store, otherSessionId, 9, "image/jpeg");

    await store.deleteSession(sessionId);

    const remaining = await Promise.all(ids.map(async (id) => download(await store.presignedUrl(sessionId, id))));
    expect(remaining).toEqual(ids.map(() => null));
    expect(await download(await store.presignedUrl(otherSessionId, otherId))).toEqual({
      bytes: bytes(9),
      contentType: "image/jpeg",
    });
    await store.deleteSession(otherSessionId);
  });

  run("deletes single images and leaves the rest of the session alone", async () => {
    const { store, download } = harness();
    const sessionId = randomUUID();
    const removed = [await upload(store, sessionId, 1, "image/jpeg"), await upload(store, sessionId, 2, "image/webp")];
    const kept = await upload(store, sessionId, 3, "image/jpeg");

    await store.deleteImages(sessionId, [...removed, createImageId()]);
    await store.deleteImages(sessionId, []);

    const remaining = await Promise.all(removed.map(async (id) => download(await store.presignedUrl(sessionId, id))));
    expect(remaining).toEqual([null, null]);
    expect(await download(await store.presignedUrl(sessionId, kept))).toEqual({
      bytes: bytes(3),
      contentType: "image/jpeg",
    });
    await store.deleteSession(sessionId);
  });

  run("lists the sessions that still have images", async () => {
    const { store } = harness();
    const kept = randomUUID();
    const deleted = randomUUID();
    await upload(store, kept, 1, "image/jpeg");
    await upload(store, kept, 2, "image/webp");
    await upload(store, deleted, 3, "image/jpeg");
    await store.deleteSession(deleted);

    const listed = await store.listSessionIds();

    expect(listed).toContain(kept);
    expect(listed).not.toContain(deleted);
    expect(listed.filter((id) => id === kept)).toHaveLength(1);
    await store.deleteSession(kept);
  });

  run("deletes a session without images, and deletes twice without failing", async () => {
    const { store } = harness();
    const sessionId = randomUUID();
    await upload(store, sessionId, 1, "image/jpeg");

    await store.deleteSession(sessionId);
    await expect(store.deleteSession(sessionId)).resolves.toBeUndefined();
    await expect(store.deleteSession(randomUUID())).resolves.toBeUndefined();
  });
});

describe("image ids", () => {
  it("are short, random and URL-safe", () => {
    const ids = Array.from({ length: 50 }, createImageId);

    expect(ids.every((id) => /^[A-Za-z0-9_-]{22}$/.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
