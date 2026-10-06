import type { AvatarContentType } from "@gamemash/shared";

export type ImageInfo = {
  type: AvatarContentType | "image/gif";
  width: number;
  height: number;
};

const JPEG_START = [0xff, 0xd8, 0xff];
const JPEG_STANDALONE_MARKERS = new Set([0x01, 0xd8, 0xd9, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7]);
const JPEG_NON_FRAME_MARKERS = new Set([0xc4, 0xc8, 0xcc]);
const VP8_KEYFRAME_SIGNATURE = [0x9d, 0x01, 0x2a];
const VP8L_SIGNATURE = 0x2f;
const FOURTEEN_BITS = 0x3fff;
const GIF_SIGNATURES = ["GIF87a", "GIF89a"];
const GIF_HEADER_BYTES = 10;

const startsWith = (bytes: Buffer, prefix: number[], offset = 0) =>
  prefix.every((value, index) => bytes[offset + index] === value);

const ascii = (bytes: Buffer, offset: number, length: number) => bytes.toString("latin1", offset, offset + length);

const isFrameMarker = (marker: number) => marker >= 0xc0 && marker <= 0xcf && !JPEG_NON_FRAME_MARKERS.has(marker);

const inspectJpeg = (bytes: Buffer): ImageInfo | null => {
  let offset = 2;
  while (offset + 9 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1] ?? 0;
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (JPEG_STANDALONE_MARKERS.has(marker)) {
      offset += 2;
      continue;
    }
    if (isFrameMarker(marker)) {
      return { type: "image/jpeg", height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + bytes.readUInt16BE(offset + 2);
  }
  return null;
};

const inspectWebp = (bytes: Buffer): ImageInfo | null => {
  const chunk = ascii(bytes, 12, 4);
  if (chunk === "VP8 " && bytes.length >= 30 && startsWith(bytes, VP8_KEYFRAME_SIGNATURE, 23)) {
    return {
      type: "image/webp",
      width: bytes.readUInt16LE(26) & FOURTEEN_BITS,
      height: bytes.readUInt16LE(28) & FOURTEEN_BITS,
    };
  }
  if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === VP8L_SIGNATURE) {
    const bits = bytes.readUInt32LE(21);
    return { type: "image/webp", width: (bits & FOURTEEN_BITS) + 1, height: ((bits >>> 14) & FOURTEEN_BITS) + 1 };
  }
  if (chunk === "VP8X" && bytes.length >= 30) {
    return { type: "image/webp", width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1 };
  }
  return null;
};

const inspectGif = (bytes: Buffer): ImageInfo | null =>
  bytes.length >= GIF_HEADER_BYTES
    ? { type: "image/gif", width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) }
    : null;

export const inspectImage = (bytes: Buffer): ImageInfo | null => {
  if (startsWith(bytes, JPEG_START)) return inspectJpeg(bytes);
  if (GIF_SIGNATURES.includes(ascii(bytes, 0, 6))) return inspectGif(bytes);
  if (bytes.length >= 16 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return inspectWebp(bytes);
  return null;
};
