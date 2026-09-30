import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";

export type ToolButtonProps = Omit<ComponentProps<typeof BaseButton>, "className"> & {
  icon: ReactNode;
  className?: string | undefined;
};

export const ToolButton = ({ icon, className, children, ...props }: ToolButtonProps) => (
  <BaseButton
    className={cn(
      "focus-ring inline-flex h-[46px] cursor-pointer items-center gap-2 rounded-key border-3 border-ink-950 bg-paper-white px-4 text-caption font-bold text-ink-950 shadow-brutal-sm",
      "motion-safe:transition-[transform,box-shadow] not-data-[disabled]:active:brutal-pressed data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    {icon}
    {children}
  </BaseButton>
);
