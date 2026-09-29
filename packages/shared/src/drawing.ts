export type DrawColor = "black" | "red" | "orange" | "yellow" | "green" | "blue" | "violet";
export type BrushSize = "thin" | "medium" | "thick";
export type StrokeColor = DrawColor | "eraser";

export type DrawPoint = [x: number, y: number, pressure: number];

export type Stroke = {
  color: StrokeColor;
  size: BrushSize;
  points: DrawPoint[];
};

export type Drawing = {
  strokes: Stroke[];
};

export const DRAW_COLORS: DrawColor[] = ["black", "red", "orange", "yellow", "green", "blue", "violet"];
export const BRUSH_SIZES: BrushSize[] = ["thin", "medium", "thick"];
export const ERASER = "eraser";

export const pointCount = (drawing: Drawing) => drawing.strokes.reduce((sum, stroke) => sum + stroke.points.length, 0);

export const isBlankDrawing = (drawing: Drawing) => drawing.strokes.every((stroke) => stroke.color === ERASER);
