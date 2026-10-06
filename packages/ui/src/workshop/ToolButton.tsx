import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";

const toolButtonVariants = cva(
  [
    "focus-ring inline-flex shrink-0 cursor-pointer items-center border-ink-950 bg-paper-white text-ink-950",
    "motion-safe:transition-[transform,box-shadow] not-data-[disabled]:active:brutal-pressed data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
  ],
  {
    variants: {
      size: {
        md: "h-[46px] gap-2 rounded-key border-3 px-4 text-caption font-bold shadow-brutal-sm",
        sm: "h-6.5 gap-1.5 rounded-sticker border-2 bg-cream px-2 font-pixel text-label-sm font-bold tracking-pixel",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export type ToolButtonProps = Omit<ComponentProps<typeof BaseButton>, "className"> &
  VariantProps<typeof toolButtonVariants> & {
    icon: ReactNode;
    className?: string | undefined;
  };

export const ToolButton = ({ icon, size, className, children, ...props }: ToolButtonProps) => (
  <BaseButton className={cn(toolButtonVariants({ size }), className)} {...props}>
    {icon}
    {children}
  </BaseButton>
);
