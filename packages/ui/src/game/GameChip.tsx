import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";

export type GameChipProps = Omit<ComponentProps<"li">, "children" | "title"> & {
  position: number;
  title: ReactNode;
  meta?: ReactNode;
};

export const GameChip = ({ position, title, meta, className, ...props }: GameChipProps) => (
  <li
    className={cn(
      "flex min-w-0 items-center gap-3 rounded-field bg-surface px-[22px] py-3 text-stage-body font-bold",
      className,
    )}
    {...props}
  >
    <span className="text-sun">{position}</span>
    <span className="shrink-0 whitespace-nowrap">{title}</span>
    {meta && <span className="min-w-0 truncate font-normal text-fg-subtle">- {meta}</span>}
  </li>
);
