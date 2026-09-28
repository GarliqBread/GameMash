import { randomUUID } from "node:crypto";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createDiskImageStore } from "./disk-image-store.js";

const directory = () => mkdtemp(join(tmpdir(), "gamemash-disk-"));

describe("disk image store", () => {
  it("refuses ids that could leave the image folder", async () => {
    const store = createDiskImageStore({ directory: await directory(), minFreeBytes: 1 });

    await expect(store.put("../escape", "image", Buffer.from([1]), "image/jpeg")).rejects.toThrow();
    await expect(store.deleteSession("..")).rejects.toThrow();
    expect(await store.read("..", "passwd")).toBeNull();
    expect(await store.read(randomUUID(), "../../etc")).toBeNull();
  });

  it("leaves no partial files behind after a write", async () => {
    const root = await directory();
    const store = createDiskImageStore({ directory: root, minFreeBytes: 1 });
    const sessionId = randomUUID();

    await store.put(sessionId, "image", Buffer.from([1, 2, 3]), "image/webp");

    expect(await readdir(join(root, "sessions", sessionId))).toEqual(["image.webp"]);
  });

  it("reports no room once free space drops below the minimum", async () => {
    const root = await directory();

    expect(await createDiskImageStore({ directory: root, minFreeBytes: 1 }).hasRoom()).toBe(true);
    expect(await createDiskImageStore({ directory: root, minFreeBytes: Number.MAX_SAFE_INTEGER }).hasRoom()).toBe(
      false,
    );
  });
});
