import type { BrushSize, DrawColor, Drawing, DrawPoint, Stroke } from "../src/lib/drawing";

type Polyline = [number, number][];

const STEP = 0.01;

const sample = (line: Polyline): DrawPoint[] =>
  line.slice(1).flatMap((end, index) => {
    const start = line[index] ?? end;
    const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
    const steps = Math.max(1, Math.ceil(length / STEP));
    return Array.from({ length: steps }, (_, step): DrawPoint => {
      const t = step / steps;
      return [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t, 0.5];
    });
  });

const stroke = (color: DrawColor, size: BrushSize, line: Polyline): Stroke => ({ color, size, points: sample(line) });

const wave = (y: number): Polyline =>
  Array.from({ length: 21 }, (_, index) => [index * 0.05, y + (index % 2 ? 0.02 : -0.02)]);

export const LIGHTHOUSE: Drawing = {
  strokes: [
    stroke("black", "medium", [
      [0.35, 0.85],
      [0.44, 0.38],
      [0.56, 0.38],
      [0.65, 0.85],
      [0.35, 0.85],
    ]),
    stroke("black", "medium", [
      [0.42, 0.38],
      [0.42, 0.29],
      [0.58, 0.29],
      [0.58, 0.38],
    ]),
    stroke("black", "medium", [
      [0.4, 0.29],
      [0.5, 0.2],
      [0.6, 0.29],
    ]),
    stroke("red", "thick", [
      [0.4, 0.62],
      [0.6, 0.62],
    ]),
    stroke("red", "thick", [
      [0.38, 0.74],
      [0.62, 0.74],
    ]),
    stroke("yellow", "medium", [
      [0.58, 0.33],
      [0.8, 0.26],
    ]),
    stroke("yellow", "medium", [
      [0.58, 0.34],
      [0.8, 0.42],
    ]),
    stroke("blue", "medium", wave(0.92)),
  ],
};

export const HOUSE: Drawing = {
  strokes: [
    stroke("black", "medium", [
      [0.2, 0.85],
      [0.2, 0.45],
      [0.8, 0.45],
      [0.8, 0.85],
      [0.2, 0.85],
    ]),
    stroke("red", "thick", [
      [0.15, 0.48],
      [0.5, 0.18],
      [0.85, 0.48],
    ]),
    stroke("orange", "medium", [
      [0.42, 0.85],
      [0.42, 0.62],
      [0.58, 0.62],
      [0.58, 0.85],
    ]),
    stroke("blue", "thin", [
      [0.27, 0.55],
      [0.37, 0.55],
      [0.37, 0.65],
      [0.27, 0.65],
      [0.27, 0.55],
    ]),
    stroke("green", "thick", wave(0.93)),
  ],
};

export const SUN: Drawing = {
  strokes: [
    stroke(
      "yellow",
      "thick",
      Array.from({ length: 25 }, (_, index): [number, number] => [
        0.5 + 0.2 * Math.cos((index / 24) * Math.PI * 2),
        0.5 + 0.2 * Math.sin((index / 24) * Math.PI * 2),
      ]),
    ),
    ...Array.from({ length: 8 }, (_, index) => {
      const angle = (index / 8) * Math.PI * 2;
      return stroke("orange", "medium", [
        [0.5 + 0.28 * Math.cos(angle), 0.5 + 0.28 * Math.sin(angle)],
        [0.5 + 0.42 * Math.cos(angle), 0.5 + 0.42 * Math.sin(angle)],
      ]);
    }),
  ],
};

export const SAMPLE_DRAWINGS = [LIGHTHOUSE, HOUSE, SUN];
