const WEBP_TYPE = "image/webp";
const FALLBACK_TYPE = "image/jpeg";

export class ImageTooLargeError extends Error {
  constructor() {
    super("image could not be compressed enough");
  }
}

export const createCanvas = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas is not supported");
  context.imageSmoothingQuality = "high";
  return { canvas, context };
};

const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

export const encodeSmallest = async (
  canvas: HTMLCanvasElement,
  qualities: number[],
  maxBytes: number,
  type = WEBP_TYPE,
): Promise<Blob> => {
  const [quality, ...rest] = qualities;
  if (quality === undefined) throw new ImageTooLargeError();
  const blob = await encode(canvas, type, quality);
  if (blob?.type !== type) {
    if (type === FALLBACK_TYPE) throw new Error("canvas cannot encode images");
    return encodeSmallest(canvas, qualities, maxBytes, FALLBACK_TYPE);
  }
  if (blob.size <= maxBytes) return blob;
  return encodeSmallest(canvas, rest, maxBytes, type);
};

export const decodeImage = async (file: Blob, options: ImageBitmapOptions = {}) => {
  try {
    return await createImageBitmap(file, { ...options, imageOrientation: "from-image" });
  } catch {
    return createImageBitmap(file, options);
  }
};
