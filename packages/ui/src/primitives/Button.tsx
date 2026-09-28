import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";

export const buttonVariants = cva(
  [
    "focus-ring inline-flex shrink-0 cursor-pointer select-none items-center justify-center text-center font-bold",
    "transition-[translate,box-shadow,background-color,color] duration-100 ease-out",
    "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
    "workshop:motion-safe:transition-[translate,transform,box-shadow,background-color]",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-primary font-display font-extrabold text-on-primary not-data-[disabled]:hover:bg-primary-hover workshop:brutal workshop:shadow-brutal workshop:not-data-[disabled]:active:brutal-pressed",
        secondary:
          "border-2 border-fg bg-transparent text-fg not-data-[disabled]:hover:bg-surface workshop:brutal workshop:bg-paper-white workshop:shadow-brutal workshop:not-data-[disabled]:active:brutal-pressed",
        ghost: "bg-transparent text-fg not-data-[disabled]:hover:bg-surface",
        dashed:
          "border-2 border-dashed border-border-strong bg-transparent text-fg not-data-[disabled]:hover:bg-surface workshop:border-3 workshop:border-ink-950 workshop:bg-paper-white/60",
      },
      size: {
        sm: "min-h-11 gap-2 rounded-control px-4 py-2 text-caption",
        md: "min-h-12 gap-2.5 rounded-control px-5 py-2.5 text-body workshop:min-h-[52px]",
        lg: "min-h-16 gap-3 rounded-button px-6 py-3 text-2xl workshop:h-[60px] workshop:min-h-0 workshop:px-7 workshop:py-0 workshop:text-[22px]",
        stage: "min-h-[88px] gap-4 rounded-card px-[52px] py-[18px] text-stage-lg",
        "stage-sm": "min-h-[68px] gap-3 rounded-card px-9 py-3 text-stage-body",
      },
    },
    compoundVariants: [
      {
        variant: "primary",
        size: ["sm", "md"],
        className:
          "shadow-primary-sm not-data-[disabled]:active:translate-y-(--gm-press-offset-sm) not-data-[disabled]:active:shadow-none",
      },
      {
        variant: "primary",
        size: ["lg", "stage", "stage-sm"],
        className:
          "shadow-primary not-data-[disabled]:active:translate-y-(--gm-press-offset) not-data-[disabled]:active:shadow-none",
      },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = Omit<ComponentProps<typeof BaseButton>, "className"> &
  VariantProps<typeof buttonVariants> & {
    className?: string | undefined;
    icon?: ReactNode;
    iconEnd?: ReactNode;
  };

export const Button = ({ variant, size, icon, iconEnd, className, children, ...props }: ButtonProps) => (
  <BaseButton className={cn(buttonVariants({ variant, size }), className)} {...props}>
    {icon}
    {children}
    {iconEnd}
  </BaseButton>
);
