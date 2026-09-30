import type { SVGProps } from "react";
import { ANSWERS, type AnswerShapeName } from "../lib/answers.js";

export type AnswerShapeProps = Omit<SVGProps<SVGSVGElement>, "children" | "color"> & {
  shape: AnswerShapeName;
  size?: number | undefined;
  color?: string | undefined;
  label?: string | undefined;
};

export const AnswerShape = ({ shape, size = 24, color = "currentColor", label, ...props }: AnswerShapeProps) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    focusable="false"
    role="img"
    aria-label={label}
    aria-hidden={label ? undefined : true}
    {...props}
  >
    <path d={ANSWERS[shape].path} fill={color} />
  </svg>
);
