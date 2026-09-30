import type { ComponentProps } from "react";
import { ClockIcon } from "../icons/icons.js";
import { cn } from "../lib/cn.js";

export type TimerPillProps = Omit<ComponentProps<"div">, "children"> & {
  seconds: number;
  label: string;
  tone?: "active" | "idle" | undefined;
};

export const TimerPill = ({ seconds, label, tone = "active", className, ...props }: TimerPillProps) => (
  <div
    role="timer"
    aria-label={label}
    className={cn(
      "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2",
      tone === "active" ? "bg-sun text-ink-950" : "bg-surface text-fg-muted",
      className,
    )}
    {...props}
  >
    <ClockIcon size={20} />
    <span aria-hidden="true" className="font-display text-2xl/[1] font-extrabold tabular-nums">
      {seconds}
    </span>
  </div>
);
