import {
  BRUSH_SIZES,
  type BrushSize,
  DRAW_COLORS,
  type DrawColor,
  type Drawing,
  type DrawPoint,
  type Fill,
  type FillPoint,
  isFill,
  type Mark,
  MIN_RING_POINTS,
  pointCount,
  type Stroke,
  type StrokeColor,
} from "@gamemash/shared";
import { getStroke } from "perfect-freehand";

export {
  BRUSH_SIZES,
  type BrushSize,
  DRAW_COLORS,
  type DrawColor,
  type Drawing,
  type DrawPoint,
  type Fill,
  type FillPoint,
  isFill,
  type Mark,
  pointCount,
  type Stroke,
};

export type DrawTool = "brush" | "eraser" | "fill";

export const DRAWING_UNITS = 1000;

const BRUSH_WIDTHS: Record<BrushSize, number> = { thin: 16, medium: 32, thick: 56 };
const POINT_PRECISION = 10_000;

export const markColorVar = (color: StrokeColor) => (color === "eraser" ? "--color-canvas" : `--color-draw-${color}`);

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

const buildFillPath = (fill: Fill) =>
  fill.rings
    .map((ring) => {
      const [first, ...rest] = ring.map(([x, y]) => `${format(x * DRAWING_UNITS)},${format(y * DRAWING_UNITS)}`);
      return `M${first}L${rest.join(" ")}Z`;
    })
    .join("");

const pathCache = new WeakMap<Mark, string>();

export const markPath = (mark: Mark) => {
  const cached = pathCache.get(mark);
  if (cached !== undefined) return cached;
  const path = isFill(mark) ? buildFillPath(mark) : buildStrokePath(mark);
  pathCache.set(mark, path);
  return path;
};

const COMPACT_STEPS = [0.002, 0.004, 0.008, 0.016, 0.032];
const COORDINATE_PRECISION = 1000;
const PRESSURE_PRECISION = 100;

const roundTo = (value: number, precision: number) => Math.round(value * precision) / precision;

const thinPoints = <P extends number[]>(points: P[], minDistance: number) => {
  const kept: P[] = [];
  for (const [index, point] of points.entries()) {
    const previous = kept.at(-1);
    const isLast = index === points.length - 1;
    const isFar =
      !previous ||
      Math.hypot((point[0] ?? 0) - (previous[0] ?? 0), (point[1] ?? 0) - (previous[1] ?? 0)) >= minDistance;
    if (isFar || isLast) kept.push(point);
  }
  return kept;
};

const thinStroke = (stroke: Stroke, minDistance: number): Stroke => ({
  ...stroke,
  points: thinPoints(
    stroke.points.map(
      ([x, y, pressure]): DrawPoint => [
        roundTo(x, COORDINATE_PRECISION),
        roundTo(y, COORDINATE_PRECISION),
        roundTo(pressure, PRESSURE_PRECISION),
      ],
    ),
    minDistance,
  ),
});

const thinFill = (fill: Fill, minDistance: number): Fill => ({
  ...fill,
  rings: fill.rings
    .map((ring) =>
      thinPoints(
        ring.map(([x, y]): FillPoint => [roundTo(x, COORDINATE_PRECISION), roundTo(y, COORDINATE_PRECISION)]),
        minDistance,
      ),
    )
    .filter((ring) => ring.length >= MIN_RING_POINTS),
});

const thinDrawing = (drawing: Drawing, minDistance: number): Drawing => ({
  strokes: drawing.strokes.flatMap((mark): Mark[] => {
    if (!isFill(mark)) return [thinStroke(mark, minDistance)];
    const thinned = thinFill(mark, minDistance);
    return thinned.rings.length > 0 ? [thinned] : [];
  }),
});

const compactWith = (drawing: Drawing, maxPoints: number, steps: number[]): Drawing => {
  const [step = 0, ...rest] = steps;
  const thinned = thinDrawing(drawing, step);
  return rest.length === 0 || pointCount(thinned) <= maxPoints ? thinned : compactWith(drawing, maxPoints, rest);
};

export const compactDrawing = (drawing: Drawing, maxPoints: number) =>
  compactWith(drawing, maxPoints, [0, ...COMPACT_STEPS]);
