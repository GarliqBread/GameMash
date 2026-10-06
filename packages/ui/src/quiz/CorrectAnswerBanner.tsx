import type { ComponentProps, ReactNode } from "react";
import { AnswerShape } from "../icons/AnswerShape.js";
import { ANSWERS, type AnswerShapeName } from "../lib/answers.js";
import { cn } from "../lib/cn.js";

export type CorrectAnswerBannerProps = Omit<ComponentProps<"div">, "children"> & {
  shape: AnswerShapeName;
  label: string;
  caption: ReactNode;
  shapeLabel: string;
  size?: "default" | "compact" | undefined;
};

const SIZES = {
  default: { box: "gap-9 px-12 py-8", shape: 110, label: "text-stage-4xl/[1]" },
  compact: { box: "gap-8 px-7 py-4.5", shape: 72, label: "text-stage-2xl/[1]" },
};

export const CorrectAnswerBanner = ({
  shape,
  label,
  caption,
  shapeLabel,
  size = "default",
  className,
  ...props
}: CorrectAnswerBannerProps) => (
  <div
    className={cn(
      "flex min-w-0 items-center rounded-panel ring-[6px] ring-cream",
      SIZES[size].box,
      ANSWERS[shape].bg,
      ANSWERS[shape].fg,
      className,
    )}
    {...props}
  >
    <AnswerShape shape={shape} size={SIZES[size].shape} label={shapeLabel} className="shrink-0" />
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-stage-body font-bold">{caption}</span>
      <span className={cn(SIZES[size].label, "font-display font-extrabold hyphens-auto wrap-break-word")}>{label}</span>
    </div>
  </div>
);
