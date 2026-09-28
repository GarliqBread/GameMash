import type { ComponentProps } from "react";
import { AnswerShape } from "../icons/AnswerShape.js";
import { ANSWERS, type AnswerShapeName } from "../lib/answers.js";
import { cn } from "../lib/cn.js";

export type AnswerTileState = "idle" | "correct" | "dimmed";

export type AnswerTileProps = Omit<ComponentProps<"div">, "children"> & {
  shape: AnswerShapeName;
  label: string;
  state?: AnswerTileState | undefined;
  shapeLabel?: string | undefined;
  stateLabel?: string | undefined;
  layout?: "row" | "stack" | undefined;
};

export const AnswerTile = ({
  shape,
  label,
  state = "idle",
  shapeLabel = ANSWERS[shape].defaultLabel,
  stateLabel,
  layout = "row",
  className,
  ...props
}: AnswerTileProps) => (
  <div
    className={cn(
      "flex min-h-[196px] min-w-0 rounded-tile px-12 py-6 transition-opacity duration-300",
      layout === "row" ? "items-center gap-10" : "flex-col justify-center gap-5 py-9",
      ANSWERS[shape].bg,
      ANSWERS[shape].fg,
      state === "correct" && "ring-[6px] ring-cream",
      state === "dimmed" && "opacity-40",
      className,
    )}
    {...props}
  >
    <AnswerShape shape={shape} size={96} label={shapeLabel} className="shrink-0" />
    <span className="min-w-0 font-display text-stage-2xl leading-[1.05] font-extrabold hyphens-auto wrap-break-word">
      {label}
    </span>
    {stateLabel && <span className="sr-only">{stateLabel}</span>}
  </div>
);
