import type { ComponentProps } from "react";
import { ANSWER_SHAPES, type AnswerShapeName } from "../lib/answers.js";
import { cn } from "../lib/cn.js";
import { AnswerShape } from "./AnswerShape.js";

type LogoSize = "sm" | "md" | "lg";

const FILLS: Record<AnswerShapeName, string> = {
  squircle: "text-brand-coral",
  triangle: "text-brand-violet",
  plus: "text-brand-lime",
  dome: "text-brand-sky",
};

const SIZES: Record<LogoSize, { mark: string; gap: string; shape: number; wordmark: string }> = {
  sm: { mark: "gap-0.5", gap: "gap-2.5", shape: 15, wordmark: "text-title-sm" },
  md: { mark: "gap-0.5", gap: "gap-3", shape: 18, wordmark: "text-title" },
  lg: { mark: "gap-1", gap: "gap-4", shape: 27, wordmark: "text-wordmark-lg" },
};

export type LogoProps = ComponentProps<"span"> & {
  size?: LogoSize | undefined;
  hasOutline?: boolean | undefined;
};

export const Logo = ({ size = "sm", hasOutline = true, className, ...props }: LogoProps) => {
  const sizing = SIZES[size];
  return (
    <span className={cn("inline-flex items-center", sizing.gap, className)} {...props}>
      <span className={cn("grid shrink-0 grid-cols-2", sizing.mark)} aria-hidden="true">
        {ANSWER_SHAPES.map((shape) => (
          <AnswerShape
            key={shape}
            shape={shape}
            size={sizing.shape}
            className={cn(
              FILLS[shape],
              hasOutline && "workshop:stroke-ink-950 workshop:stroke-2 workshop:[stroke-linejoin:round]",
            )}
          />
        ))}
      </span>
      <span className={cn("font-display font-extrabold tracking-display-tight", sizing.wordmark)}>GameMash</span>
    </span>
  );
};
