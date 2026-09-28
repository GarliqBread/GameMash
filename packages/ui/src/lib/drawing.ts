import { getStroke } from "perfect-freehand";

export type DrawColor = "black" | "red" | "orange" | "yellow" | "green" | "blue" | "violet";
export type BrushSize = "thin" | "medium" | "thick";
export type DrawTool = "brush" | "eraser";

export type DrawPoint = [x: number, y: number, pressure: number];

export type Stroke = {
  color: DrawColor | "eraser";
  size: BrushSize;
  points: DrawPoint[];
};

export type Drawing = {
  strokes: Stroke[];
};

export const DRAW_COLORS: DrawColor[] = ["black", "red", "orange", "yellow", "green", "blue", "violet"];
export const BRUSH_SIZES: BrushSize[] = ["thin", "medium", "thick"];

export const DRAWING_UNITS = 1000;

const BRUSH_WIDTHS: Record<BrushSize, number> = { thin: 16, medium: 32, thick: 56 };
const POINT_PRECISION = 10_000;

export const strokeColorVar = (color: Stroke["color"]) =>
  color === "eraser" ? "--color-canvas" : `--color-draw-${color}`;

const round = (value: number) => Math.round(value * POINT_PRECISION) / POINT_PRECISION;
const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

export const normalizePoint = (x: number, y: number, pressure: number, width: number, height: number): DrawPoint => [
  round(clampUnit(x / width)),
  round(clampUnit(y / height)),
  round(pressure),
];

const midpoint = (a: number, b: number) => (a + b) / 2;
const format = (value: number) => value.toFixed(1);

const outlineToPath = (outline: number[][]) => {
  const [first, second, third] = outline;
  if (!first || !second || !third) return "";
  const head = `M${format(first[0] ?? 0)},${format(first[1] ?? 0)} Q${format(second[0] ?? 0)},${format(second[1] ?? 0)} ${format(midpoint(second[0] ?? 0, third[0] ?? 0))},${format(midpoint(second[1] ?? 0, third[1] ?? 0))} T`;
  const tail = outline
    .slice(2, -1)
    .map((point, index) => {
      const next = outline[index + 3] ?? point;
      return `${format(midpoint(point[0] ?? 0, next[0] ?? 0))},${format(midpoint(point[1] ?? 0, next[1] ?? 0))}`;
    })
    .join(" ");
  return `${head}${tail}Z`;
};

const pathCache = new WeakMap<Stroke, string>();

const buildStrokePath = (stroke: Stroke) =>
  outlineToPath(
    getStroke(
      stroke.points.map(([x, y, pressure]) => [x * DRAWING_UNITS, y * DRAWING_UNITS, pressure]),
      {
        size: BRUSH_WIDTHS[stroke.size],
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
        simulatePressure: true,
      },
    ),
  );

export const strokePath = (stroke: Stroke) => {
  const cached = pathCache.get(stroke);
  if (cached !== undefined) return cached;
  const path = buildStrokePath(stroke);
  pathCache.set(stroke, path);
  return path;
};
