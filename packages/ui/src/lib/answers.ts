export type AnswerShapeName = "triangle" | "diamond" | "circle" | "square";

export type AnswerStyle = {
  bg: string;
  fg: string;
  focus: string;
  path: string;
  defaultLabel: string;
};

export type AnswerOption = {
  shape: AnswerShapeName;
  label: string;
  shapeLabel?: string | undefined;
};

export const ANSWER_SHAPES: AnswerShapeName[] = ["triangle", "diamond", "circle", "square"];

export const ANSWERS: Record<AnswerShapeName, AnswerStyle> = {
  triangle: {
    bg: "bg-answer-triangle",
    fg: "text-on-answer-triangle",
    focus: "[--color-focus:var(--color-on-answer-triangle)]",
    path: "M12 3 L22 20 H2 Z",
    defaultLabel: "Triangle",
  },
  diamond: {
    bg: "bg-answer-diamond",
    fg: "text-on-answer-diamond",
    focus: "[--color-focus:var(--color-on-answer-diamond)]",
    path: "M12 2 L22 12 L12 22 L2 12 Z",
    defaultLabel: "Diamond",
  },
  circle: {
    bg: "bg-answer-circle",
    fg: "text-on-answer-circle",
    focus: "[--color-focus:var(--color-on-answer-circle)]",
    path: "M12 2 A10 10 0 1 0 12 22 A10 10 0 1 0 12 2 Z",
    defaultLabel: "Circle",
  },
  square: {
    bg: "bg-answer-square",
    fg: "text-on-answer-square",
    focus: "[--color-focus:var(--color-on-answer-square)]",
    path: "M5 3 H19 A2 2 0 0 1 21 5 V19 A2 2 0 0 1 19 21 H5 A2 2 0 0 1 3 19 V5 A2 2 0 0 1 5 3 Z",
    defaultLabel: "Square",
  },
};
