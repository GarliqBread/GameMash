import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inspectImage } from "./image.js";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url));

const webpHeader = (chunk: string, body: number[]) => {
  const bytes = Buffer.alloc(40);
  bytes.write("RIFF", 0, "latin1");
  bytes.write("WEBP", 8, "latin1");
  bytes.write(chunk, 12, "latin1");
  Buffer.from(body).copy(bytes, 20);
  return bytes;
};

describe("inspectImage", () => {
  it.each([
    ["lossy-256.webp", "image/webp", 256, 256],
    ["alpha-256.webp", "image/webp", 256, 256],
    ["lossless-200x100.webp", "image/webp", 200, 100],
    ["photo-256.jpg", "image/jpeg", 256, 256],
    ["huge-4000x10.jpg", "image/jpeg", 4000, 10],
  ])("reads the real type and size of %s", (name, type, width, height) => {
    expect(inspectImage(fixture(name))).toEqual({ type, width, height });
  });

  it("reads simple lossy VP8 headers", () => {
    const bytes = webpHeader("VP8 ", [0, 0, 0, 0x9d, 0x01, 0x2a, 0x00, 0x01, 0x80, 0x00]);

    expect(inspectImage(bytes)).toEqual({ type: "image/webp", width: 256, height: 128 });
  });

  it("reads lossless VP8L headers", () => {
    const bits = (300 - 1) | ((150 - 1) << 14);
    const size = Buffer.alloc(4);
    size.writeUInt32LE(bits);
    const bytes = webpHeader("VP8L", [0x2f, ...size]);

    expect(inspectImage(bytes)).toEqual({ type: "image/webp", width: 300, height: 150 });
  });

  it.each([
    ["a PNG", fixture("not-allowed.png")],
    ["plain text", Buffer.from("definitely not an image")],
    ["a truncated JPEG", fixture("photo-256.jpg").subarray(0, 20)],
    ["an empty file", Buffer.alloc(0)],
  ])("rejects %s", (_label, bytes) => {
    expect(inspectImage(bytes)).toBeNull();
  });
});
