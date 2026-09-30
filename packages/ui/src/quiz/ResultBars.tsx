import type { ComponentProps } from "react";
import { AnswerShape } from "../icons/AnswerShape.js";
import { ANSWERS, type AnswerShapeName } from "../lib/answers.js";
import { cn } from "../lib/cn.js";

export type ResultRow = {
  shape: AnswerShapeName;
  label: string;
  count: number;
  shapeLabel?: string | undefined;
};

const barShare = (count: number, total: number) => (total <= 0 ? 0 : Math.min(1, Math.max(0, count / total)));

export type ResultBarsProps = Omit<ComponentProps<"ul">, "children"> & {
  rows: ResultRow[];
  total: number;
  correct: AnswerShapeName;
  correctLabel: string;
};

export const ResultBars = ({ rows, total, correct, correctLabel, className, ...props }: ResultBarsProps) => (
  <ul className={cn("flex flex-col gap-[18px]", className)} {...props}>
    {rows.map((row) => {
      const isCorrect = row.shape === correct;
      return (
        <li key={row.shape} className={cn("flex h-[72px] items-center gap-6", !isCorrect && "opacity-55")}>
          <span
            className={cn(
              "flex size-[72px] shrink-0 items-center justify-center rounded-button",
              ANSWERS[row.shape].bg,
              ANSWERS[row.shape].fg,
            )}
          >
            <AnswerShape shape={row.shape} size={40} label={row.shapeLabel ?? ANSWERS[row.shape].defaultLabel} />
          </span>
          <span className="w-[260px] shrink-0 truncate text-stage-lg font-bold">
            {row.label}
            {isCorrect && <span className="sr-only"> {correctLabel}</span>}
          </span>
          <span aria-hidden="true" className="flex h-7 min-w-0 flex-1 overflow-hidden rounded-full bg-ink-850">
            <span
              className={cn("h-full rounded-full", isCorrect ? "bg-cream" : "bg-ink-400")}
              style={{ width: `${barShare(row.count, total) * 100}%` }}
            />
          </span>
          <span className="w-16 shrink-0 text-right font-display text-stage-xl font-extrabold tabular-nums">
            {row.count}
          </span>
        </li>
      );
    })}
  </ul>
);
