import type { ComponentProps } from "react";
import { AnswerShape } from "../icons/AnswerShape.js";
import { ANSWERS, type AnswerShapeName } from "../lib/answers.js";
import { cn } from "../lib/cn.js";

export type ResultRow = {
  shape: AnswerShapeName;
  label: string;
  count: number;
  shapeLabel: string;
};

const barShare = (count: number, total: number) => (total <= 0 ? 0 : Math.min(1, Math.max(0, count / total)));

export type ResultBarsProps = Omit<ComponentProps<"ul">, "children"> & {
  rows: ResultRow[];
  total: number;
  correct: AnswerShapeName;
  correctLabel: string;
  size?: "default" | "compact" | undefined;
};

const SIZES = {
  default: {
    list: "gap-4.5",
    row: "h-18 gap-6",
    tile: "size-18",
    shape: 40,
    label: "w-65 text-stage-lg",
    bar: "h-7",
    count: "w-16 text-stage-xl",
  },
  compact: {
    list: "gap-2.5",
    row: "h-11.5 gap-5.5",
    tile: "size-11.5",
    shape: 26,
    label: "w-42.5 text-stage-caption",
    bar: "h-6",
    count: "w-14 text-stage-lg",
  },
};

export const ResultBars = ({
  rows,
  total,
  correct,
  correctLabel,
  size = "default",
  className,
  ...props
}: ResultBarsProps) => (
  <ul className={cn("flex flex-col", SIZES[size].list, className)} {...props}>
    {rows.map((row) => {
      const isCorrect = row.shape === correct;
      return (
        <li key={row.shape} className={cn("flex items-center", SIZES[size].row, !isCorrect && "opacity-55")}>
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-button",
              SIZES[size].tile,
              ANSWERS[row.shape].bg,
              ANSWERS[row.shape].fg,
            )}
          >
            <AnswerShape shape={row.shape} size={SIZES[size].shape} label={row.shapeLabel} />
          </span>
          <span className={cn("shrink-0 truncate font-bold", SIZES[size].label)}>
            {row.label}
            {isCorrect && <span className="sr-only"> {correctLabel}</span>}
          </span>
          <span
            aria-hidden="true"
            className={cn("flex min-w-0 flex-1 overflow-hidden rounded-full bg-ink-850", SIZES[size].bar)}
          >
            <span
              className={cn("h-full rounded-full", isCorrect ? "bg-cream" : "bg-ink-400")}
              style={{ width: `${barShare(row.count, total) * 100}%` }}
            />
          </span>
          <span className={cn("shrink-0 text-right font-display font-extrabold tabular-nums", SIZES[size].count)}>
            {row.count}
          </span>
        </li>
      );
    })}
  </ul>
);
