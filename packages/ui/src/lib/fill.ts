import {
  DRAW_COLORS,
  type DrawColor,
  ERASER,
  type Fill,
  type FillPoint,
  type Mark,
  MIN_RING_POINTS,
  type StrokeColor,
} from "@gamemash/shared";
import { contours } from "d3-contour";
import simplify from "simplify-js";
import { type ColorOf, paintMarks } from "./paint.js";

export const FILL_GRID = 512;
const EDGE_THRESHOLD = 0.1;
const SIMPLIFY_CELLS = 0.4;
const MIN_RING_AREA_CELLS = 2;
const CHANNELS = 4;
const UNIT_PRECISION = 10_000;
const SOLID_COLORS: StrokeColor[] = [ERASER, ...DRAW_COLORS];

export type Rgb = [r: number, g: number, b: number];

const distance = (pixels: Uint8ClampedArray, offset: number, [r, g, b]: Rgb) =>
  ((pixels[offset] ?? 0) - r) ** 2 + ((pixels[offset + 1] ?? 0) - g) ** 2 + ((pixels[offset + 2] ?? 0) - b) ** 2;

export const nearestColors = (pixels: Uint8ClampedArray, palette: Rgb[]): Uint8Array => {
  const labels = new Uint8Array(pixels.length / CHANNELS);
  for (let cell = 0; cell < labels.length; cell += 1) {
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const [index, color] of palette.entries()) {
      const current = distance(pixels, cell * CHANNELS, color);
      if (current < bestDistance) {
        best = index;
        bestDistance = current;
      }
    }
    labels[cell] = best;
  }
  return labels;
};

export const floodMask = (labels: Uint8Array, size: number, seed: number): Uint8Array => {
  const mask = new Uint8Array(labels.length);
  const target = labels[seed];
  const pending = [seed];
  mask[seed] = 1;
  while (pending.length > 0) {
    const cell = pending.pop() ?? 0;
    const x = cell % size;
    const neighbours = [x > 0 ? cell - 1 : -1, x < size - 1 ? cell + 1 : -1, cell - size, cell + size];
    for (const next of neighbours) {
      if (next < 0 || next >= mask.length || mask[next] === 1 || labels[next] !== target) continue;
      mask[next] = 1;
      pending.push(next);
    }
  }
  return mask;
};

const ringArea = (ring: { x: number; y: number }[]) =>
  Math.abs(
    ring.reduce((sum, point, index) => {
      const next = ring[(index + 1) % ring.length] ?? point;
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2,
  );

const toUnit = (value: number, size: number) =>
  Math.round(Math.min(1, Math.max(0, value / size)) * UNIT_PRECISION) / UNIT_PRECISION;

export const maskToRings = (mask: Uint8Array, size: number): FillPoint[][] => {
  const [shape] = contours().size([size, size]).thresholds([EDGE_THRESHOLD])(Array.from(mask));
  return (shape?.coordinates ?? [])
    .flat()
    .map((ring) =>
      simplify(
        ring.slice(0, -1).map(([x = 0, y = 0]) => ({ x, y })),
        SIMPLIFY_CELLS,
        true,
      ),
    )
    .filter((ring) => ring.length >= MIN_RING_POINTS && ringArea(ring) >= MIN_RING_AREA_CELLS)
    .map((ring) => ring.map(({ x, y }): FillPoint => [toUnit(x, size), toUnit(y, size)]));
};

const rgbOf = (context: CanvasRenderingContext2D, css: string): Rgb => {
  context.fillStyle = css;
  const hex = String(context.fillStyle).replace("#", "");
  return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) || 0) as Rgb;
};

const isSameRgb = (a: Rgb | undefined, b: Rgb) => a?.every((channel, index) => channel === b[index]) === true;

export const computeFill = (
  marks: Mark[],
  colorOf: ColorOf,
  point: FillPoint,
  color: DrawColor,
  size = FILL_GRID,
): Fill | null => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  paintMarks(context, marks, colorOf);
  const palette = SOLID_COLORS.map((solid) => rgbOf(context, colorOf(solid)));
  const labels = nearestColors(context.getImageData(0, 0, size, size).data, palette);
  const seedX = Math.min(size - 1, Math.floor(point[0] * size));
  const seedY = Math.min(size - 1, Math.floor(point[1] * size));
  const seed = seedY * size + seedX;
  if (isSameRgb(palette[labels[seed] ?? 0], rgbOf(context, colorOf(color)))) return null;
  const rings = maskToRings(floodMask(labels, size, seed), size);
  return rings.length > 0 ? { kind: "fill", color, rings } : null;
};
