import type { ComponentProps } from "react";
import { cn } from "../lib/cn.js";

export type ProgressDotsProps = Omit<ComponentProps<"div">, "children"> & {
  total: number;
  current: number;
};

const dotClassName = (index: number, current: number) => {
  if (index < current) return "bg-ink-400";
  if (index === current) return "bg-sun ring-2 ring-sun ring-offset-4 ring-offset-bg";
  return "bg-surface-2";
};

export const ProgressDots = ({ total, current, className, ...props }: ProgressDotsProps) => (
  <div aria-hidden="true" className={cn("flex flex-wrap gap-2.5", className)} {...props}>
    {Array.from({ length: total }, (_, index) => index + 1).map((step) => (
      <span key={step} className={cn("size-[18px] rounded-full", dotClassName(step, current))} />
    ))}
  </div>
);
