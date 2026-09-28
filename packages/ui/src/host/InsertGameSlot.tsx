import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentProps } from "react";
import { cn } from "../lib/cn.js";

export type InsertGameSlotProps = Omit<ComponentProps<typeof BaseButton>, "className"> & {
  className?: string | undefined;
};

export const InsertGameSlot = ({ className, children, ...props }: InsertGameSlotProps) => (
  <BaseButton
    className={cn(
      "focus-ring flex h-[84px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-3 border-dashed border-ink-950 bg-paper-white/60 text-ink-950",
      "motion-safe:transition-colors not-data-[disabled]:hover:bg-paper-white",
      className,
    )}
    {...props}
  >
    <span aria-hidden="true" className="h-2.5 w-[120px] rounded-full border-2 border-ink-950 bg-ink-950" />
    <span className="font-pixel tracking-pixel text-[15px] font-bold">{children}</span>
  </BaseButton>
);
