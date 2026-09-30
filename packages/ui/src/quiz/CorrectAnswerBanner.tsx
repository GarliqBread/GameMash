import type { ComponentProps, ReactNode } from "react";
import { AnswerShape } from "../icons/AnswerShape.js";
import { ANSWERS, type AnswerShapeName } from "../lib/answers.js";
import { cn } from "../lib/cn.js";

export type CorrectAnswerBannerProps = Omit<ComponentProps<"div">, "children"> & {
  shape: AnswerShapeName;
  label: string;
  caption: ReactNode;
  shapeLabel?: string | undefined;
};

export const CorrectAnswerBanner = ({
  shape,
  label,
  caption,
  shapeLabel = ANSWERS[shape].defaultLabel,
  className,
  ...props
}: CorrectAnswerBannerProps) => (
  <div
    className={cn(
      "flex min-w-0 items-center gap-9 rounded-panel px-12 py-8 ring-[6px] ring-cream",
      ANSWERS[shape].bg,
      ANSWERS[shape].fg,
      className,
    )}
    {...props}
  >
    <AnswerShape shape={shape} size={110} label={shapeLabel} className="shrink-0" />
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-stage-body font-bold">{caption}</span>
      <span className="font-display text-stage-4xl/[1] font-extrabold hyphens-auto wrap-break-word">{label}</span>
    </div>
  </div>
);
