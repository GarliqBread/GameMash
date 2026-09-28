import type { ComponentProps } from "react";
import { ANSWER_SHAPES, type AnswerShapeName } from "../lib/answers.js";
import { cn } from "../lib/cn.js";
import { AnswerShape } from "./AnswerShape.js";

type LogoTone = "stage" | "paper";
type LogoSize = "sm" | "md" | "lg";

const TONE_FILLS: Record<LogoTone, Record<AnswerShapeName, string>> = {
  stage: {
    triangle: "text-brand-orange",
    diamond: "text-brand-blue",
    circle: "text-brand-yellow",
    square: "text-brand-teal",
  },
  paper: {
    triangle: "text-answer-triangle",
    diamond: "text-answer-diamond",
    circle: "text-brand-yellow-deep",
    square: "text-answer-square",
  },
};

const SIZES: Record<LogoSize, { mark: string; gap: string; shape: number; wordmark: string }> = {
  sm: { mark: "size-7 gap-0.5", gap: "gap-2.5", shape: 13, wordmark: "text-title-sm" },
  md: { mark: "size-9 gap-[3px]", gap: "gap-3", shape: 16, wordmark: "text-title" },
  lg: { mark: "size-12 gap-1", gap: "gap-4", shape: 22, wordmark: "text-wordmark-lg" },
};

export type LogoProps = ComponentProps<"span"> & {
  tone?: LogoTone | undefined;
  size?: LogoSize | undefined;
  showWordmark?: boolean | undefined;
  label?: string | undefined;
};

export const Logo = ({ tone = "paper", size = "sm", showWordmark = true, label, className, ...props }: LogoProps) => {
  const sizing = SIZES[size];
  const imageProps = !showWordmark && label ? { role: "img", "aria-label": label } : {};
  return (
    <span className={cn("inline-flex items-center", sizing.gap, className)} {...imageProps} {...props}>
      <span className={cn("grid shrink-0 grid-cols-2", sizing.mark)} aria-hidden="true">
        {ANSWER_SHAPES.map((shape) => (
          <AnswerShape
            key={shape}
            shape={shape}
            size={sizing.shape}
            className={cn(
              TONE_FILLS[tone][shape],
              "workshop:stroke-ink-950 workshop:stroke-2 workshop:[stroke-linejoin:round]",
            )}
          />
        ))}
      </span>
      {showWordmark && (
        <span className={cn("font-display font-extrabold tracking-display", sizing.wordmark)}>GameMash</span>
      )}
    </span>
  );
};
