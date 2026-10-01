import type { ComponentProps } from "react";
import { AnswerShape } from "../icons/AnswerShape.js";
import { ANSWERS, type AnswerShapeName } from "../lib/answers.js";
import { cn } from "../lib/cn.js";

export type AnswerTileState = "idle" | "correct" | "dimmed";

export type AnswerTileProps = Omit<ComponentProps<"div">, "children"> & {
  shape: AnswerShapeName;
  label: string;
  state?: AnswerTileState | undefined;
  shapeLabel: string;
  stateLabel?: string | undefined;
  layout?: "row" | "stack" | undefined;
  density?: "regular" | "compact" | undefined;
};

export const AnswerTile = ({
  shape,
  label,
  state = "idle",
  shapeLabel,
  stateLabel,
  layout = "row",
  density = "regular",
  className,
  ...props
}: AnswerTileProps) => (
  <div
    className={cn(
      "flex min-w-0 rounded-tile transition-opacity duration-300",
      density === "compact" ? "min-h-[116px] px-10 py-4" : "min-h-[196px] px-12 py-6",
      layout === "row" && (density === "compact" ? "items-center gap-8" : "items-center gap-10"),
      layout === "stack" &&
        (density === "compact" ? "flex-col justify-center gap-3" : "flex-col justify-center gap-5 py-9"),
      ANSWERS[shape].bg,
      ANSWERS[shape].fg,
      state === "correct" && "ring-[6px] ring-cream",
      state === "dimmed" && "opacity-40",
      className,
    )}
    {...props}
  >
    <AnswerShape shape={shape} size={density === "compact" ? 64 : 96} label={shapeLabel} className="shrink-0" />
    <span
      className={cn(
        "min-w-0 font-display leading-[1.05] font-extrabold hyphens-auto wrap-break-word",
        density === "compact" ? "text-stage-xl" : "text-stage-2xl",
      )}
    >
      {label}
    </span>
    {stateLabel && <span className="sr-only">{stateLabel}</span>}
  </div>
);
