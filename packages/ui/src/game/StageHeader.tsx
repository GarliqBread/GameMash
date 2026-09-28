import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { Pill } from "../primitives/Pill.js";

export type StageHeaderProps = Omit<ComponentProps<"div">, "children"> & {
  game: ReactNode;
  progress?: ReactNode;
  right?: ReactNode;
};

export const StageHeader = ({ game, progress, right, className, ...props }: StageHeaderProps) => (
  <div className={cn("flex w-full min-w-0 items-center justify-between gap-8", className)} {...props}>
    <div className="flex min-w-0 items-center gap-5">
      <Pill className="shrink-0">{game}</Pill>
      {progress && <span className="min-w-0 truncate text-stage-lg font-bold text-fg-muted">{progress}</span>}
    </div>
    {right && <div className="flex shrink-0 items-center gap-10">{right}</div>}
  </div>
);
