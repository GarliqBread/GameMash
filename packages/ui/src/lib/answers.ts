export type AnswerShapeName = "squircle" | "triangle" | "plus" | "dome";

export type AnswerStyle = {
  bg: string;
  fg: string;
  text: string;
  brandText: string;
  drop: string;
  focus: string;
  path: string;
};

export type AnswerOption = {
  shape: AnswerShapeName;
  label: string;
  shapeLabel: string;
};

export const ANSWER_SHAPES: AnswerShapeName[] = ["squircle", "triangle", "plus", "dome"];

export const ANSWERS: Record<AnswerShapeName, AnswerStyle> = {
  squircle: {
    bg: "bg-answer-squircle",
    fg: "text-on-answer-squircle",
    text: "text-answer-squircle",
    brandText: "text-brand-coral",
    drop: "shadow-drop-coral",
    focus: "[--color-focus:var(--color-on-answer-squircle)]",
    path: "M12 3 C19 3 21 5 21 12 C21 19 19 21 12 21 C5 21 3 19 3 12 C3 5 5 3 12 3 Z",
  },
  triangle: {
    bg: "bg-answer-triangle",
    fg: "text-on-answer-triangle",
    text: "text-answer-triangle",
    brandText: "text-brand-violet",
    drop: "shadow-drop-violet",
    focus: "[--color-focus:var(--color-on-answer-triangle)]",
    path: "M12 3.5 C13.4 3.5 14.3 4.4 15.2 6 L21 16.5 C22 18.4 20.8 20.5 18.6 20.5 H5.4 C3.2 20.5 2 18.4 3 16.5 L8.8 6 C9.7 4.4 10.6 3.5 12 3.5 Z",
  },
  plus: {
    bg: "bg-answer-plus",
    fg: "text-on-answer-plus",
    text: "text-answer-plus",
    brandText: "text-brand-lime",
    drop: "shadow-drop-lime",
    focus: "[--color-focus:var(--color-on-answer-plus)]",
    path: "M9 3 H15 A1.5 1.5 0 0 1 16.5 4.5 V7.5 H19.5 A1.5 1.5 0 0 1 21 9 V15 A1.5 1.5 0 0 1 19.5 16.5 H16.5 V19.5 A1.5 1.5 0 0 1 15 21 H9 A1.5 1.5 0 0 1 7.5 19.5 V16.5 H4.5 A1.5 1.5 0 0 1 3 15 V9 A1.5 1.5 0 0 1 4.5 7.5 H7.5 V4.5 A1.5 1.5 0 0 1 9 3 Z",
  },
  dome: {
    bg: "bg-answer-dome",
    fg: "text-on-answer-dome",
    text: "text-answer-dome",
    brandText: "text-brand-sky",
    drop: "shadow-drop-sky",
    focus: "[--color-focus:var(--color-on-answer-dome)]",
    path: "M3 17 C3 10 7 5 12 5 C17 5 21 10 21 17 C21 19 20 20 18 20 H6 C4 20 3 19 3 17 Z",
  },
};
