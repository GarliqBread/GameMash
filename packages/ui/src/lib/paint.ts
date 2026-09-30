import type { StrokeColor } from "@gamemash/shared";
import { DRAWING_UNITS, isFill, type Mark, markColorVar, markPath } from "./drawing.js";

export type ColorOf = (color: StrokeColor) => string;

const canvasPaths = new WeakMap<Mark, Path2D>();

const pathFor = (mark: Mark) => {
  const cached = canvasPaths.get(mark);
  if (cached) return cached;
  const path = new Path2D(markPath(mark));
  canvasPaths.set(mark, path);
  return path;
};

export const colorsOf = (element: Element): ColorOf => {
  const styles = getComputedStyle(element);
  return (color) => styles.getPropertyValue(markColorVar(color)).trim();
};

export const paintMarks = (context: CanvasRenderingContext2D, marks: Mark[], colorOf: ColorOf) => {
  const { width, height } = context.canvas;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = colorOf("eraser");
  context.fillRect(0, 0, width, height);
  context.setTransform(width / DRAWING_UNITS, 0, 0, height / DRAWING_UNITS, 0, 0);
  for (const mark of marks) {
    context.fillStyle = colorOf(mark.color);
    context.fill(pathFor(mark), isFill(mark) ? "evenodd" : "nonzero");
  }
};
