import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../lib/cn.js";

const iconButtonVariants = cva(
  [
    "focus-ring inline-flex shrink-0 cursor-pointer items-center justify-center rounded-control text-fg",
    "transition-colors duration-100 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
  ],
  {
    variants: {
      variant: {
        ghost:
          "bg-transparent text-fg-muted not-data-[disabled]:not-aria-pressed:hover:bg-surface not-data-[disabled]:hover:text-fg",
        surface: "bg-surface not-data-[disabled]:not-aria-pressed:hover:bg-surface-2",
        secondary:
          "border-2 border-fg bg-transparent not-data-[disabled]:not-aria-pressed:hover:bg-surface workshop:brutal workshop:rounded-key workshop:bg-paper-white workshop:shadow-brutal-sm workshop:not-data-[disabled]:active:brutal-pressed",
        dashed:
          "border-2 border-dashed border-border-strong bg-transparent not-data-[disabled]:not-aria-pressed:hover:bg-surface workshop:border-3 workshop:border-ink-950 workshop:rounded-key",
      },
      size: {
        sm: "size-11",
        md: "size-12",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "sm",
    },
  },
);

export type IconButtonProps = Omit<ComponentProps<typeof BaseButton>, "className" | "aria-label"> &
  VariantProps<typeof iconButtonVariants> & {
    label: string;
    className?: string | undefined;
  };

export const IconButton = ({ label, variant, size, className, ...props }: IconButtonProps) => (
  <BaseButton aria-label={label} className={cn(iconButtonVariants({ variant, size }), className)} {...props} />
);
