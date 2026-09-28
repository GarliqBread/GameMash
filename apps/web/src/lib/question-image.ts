import { QUESTION_IMAGE_MAX_BYTES, QUESTION_IMAGE_MAX_DIMENSION } from "@gamemash/shared";
import { createCanvas, decodeImage, encodeSmallest } from "./image-encoding";

const QUALITIES = [0.9, 0.8, 0.7, 0.6, 0.5];

const readSize = (file: Blob) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image could not be read"));
    };
    image.src = url;
  });

const scaleFor = (width: number, height: number) => Math.min(1, QUESTION_IMAGE_MAX_DIMENSION / Math.max(width, height));

const decodeScaled = async (file: Blob) => {
  const { width, height } = await readSize(file);
  const scale = scaleFor(width, height);
  if (scale === 1) return decodeImage(file);
  return decodeImage(file, { resizeWidth: Math.max(1, Math.round(width * scale)), resizeQuality: "high" });
};

const drawScaled = (bitmap: ImageBitmap) => {
  const scale = scaleFor(bitmap.width, bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const { canvas, context } = createCanvas(width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  return canvas;
};

export const resizeQuestionImage = async (file: Blob) => {
  const bitmap = await decodeScaled(file);
  try {
    return await encodeSmallest(drawScaled(bitmap), QUALITIES, QUESTION_IMAGE_MAX_BYTES);
  } finally {
    bitmap.close();
  }
};
