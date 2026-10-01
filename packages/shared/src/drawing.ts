export type DrawColor =
  | "black"
  | "gray"
  | "white"
  | "brown"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "sky"
  | "blue"
  | "violet"
  | "pink";
export type BrushSize = "thin" | "medium" | "thick";
export type StrokeColor = DrawColor | "eraser";

export type DrawPoint = [x: number, y: number, pressure: number];
export type FillPoint = [x: number, y: number];

export type Stroke = {
  color: StrokeColor;
  size: BrushSize;
  points: DrawPoint[];
};

export type Fill = {
  kind: "fill";
  color: DrawColor;
  rings: FillPoint[][];
};

export type Mark = Stroke | Fill;

export type Drawing = {
  strokes: Mark[];
};

export const DRAW_COLORS: DrawColor[] = [
  "black",
  "gray",
  "white",
  "brown",
  "red",
  "orange",
  "yellow",
  "green",
  "sky",
  "blue",
  "violet",
  "pink",
];
export const BRUSH_SIZES: BrushSize[] = ["thin", "medium", "thick"];
export const ERASER = "eraser";
export const FILL = "fill";
export const MIN_RING_POINTS = 3;

const INVISIBLE_COLORS = new Set<StrokeColor>([ERASER, "white"]);

export const isFill = (mark: Mark): mark is Fill => "kind" in mark && mark.kind === FILL;

const markPointCount = (mark: Mark) =>
  isFill(mark) ? mark.rings.reduce((sum, ring) => sum + ring.length, 0) : mark.points.length;

export const pointCount = (drawing: Drawing) => drawing.strokes.reduce((sum, mark) => sum + markPointCount(mark), 0);

export const isBlankDrawing = (drawing: Drawing) => drawing.strokes.every((mark) => INVISIBLE_COLORS.has(mark.color));
