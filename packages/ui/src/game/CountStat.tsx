import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";

export type CountStatProps = Omit<ComponentProps<"div">, "children"> & {
  value: ReactNode;
  total?: ReactNode;
  caption: ReactNode;
  align?: "start" | "end" | undefined;
  layout?: "stack" | "inline" | undefined;
  size?: "md" | "lg" | undefined;
};

const layoutClassName = (layout: "stack" | "inline", align: "start" | "end") => {
  if (layout === "inline") return "items-baseline gap-4";
  return cn("flex-col gap-0.5", align === "end" ? "items-end text-right" : "items-start");
};

export const CountStat = ({
  value,
  total,
  caption,
  align = "end",
  layout = "stack",
  size = "lg",
  className,
  ...props
}: CountStatProps) => (
  <div className={cn("flex", layoutClassName(layout, align), className)} {...props}>
    <span
      className={cn(
        "font-display font-extrabold tabular-nums",
        size === "lg" ? "text-stage-2xl/[1]" : "text-stage-xl/[1]",
      )}
    >
      {value}
      {total !== undefined && <span className="text-ink-400"> / {total}</span>}
    </span>
    <span className="text-stage-caption text-fg-subtle">{caption}</span>
  </div>
);
