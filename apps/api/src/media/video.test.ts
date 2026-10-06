import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inspectVideo } from "./video.js";

const fixture = (name: string) => readFileSync(new URL(`../sessions/fixtures/${name}`, import.meta.url));

describe("inspectVideo", () => {
  it("reads the size and length of an H.264 and AAC MP4", async () => {
    const info = await inspectVideo(fixture("proof-320x180.mp4"));

    expect(info).toMatchObject({ width: 320, height: 180 });
    expect(info?.durationMs).toBeGreaterThanOrEqual(1000);
    expect(info?.durationMs).toBeLessThan(1100);
  });

  it.each([
    ["bigger than 720p", "proof-1920x1080.mp4"],
    ["longer than 2 minutes", "proof-125s.mp4"],
    ["audio that is not AAC", "proof-opus.mp4"],
    ["an image instead of a video", "photo-256.jpg"],
  ])("rejects %s", async (_case, name) => {
    expect(await inspectVideo(fixture(name))).toBeNull();
  });

  it("gives up on a file built to keep the parser busy, without blocking the server", async () => {
    let ticks = 0;
    const timer = setInterval(() => {
      ticks += 1;
    }, 100);

    const info = await inspectVideo(fixture("proof-huge-chunk.mp4"));

    clearInterval(timer);
    expect(info).toBeNull();
    expect(ticks).toBeGreaterThan(10);
  }, 15_000);

  it("rejects bytes that only start like an MP4", async () => {
    const truncated = fixture("proof-320x180.mp4").subarray(0, 64);

    expect(await inspectVideo(truncated)).toBeNull();
    expect(await inspectVideo(Buffer.alloc(0))).toBeNull();
  });
});
