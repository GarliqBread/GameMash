import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../lib/cn.js";

const pillVariants = cva("inline-flex max-w-full items-center gap-2 rounded-full font-display font-extrabold", {
  variants: {
    variant: {
      solid: "bg-fg text-bg",
      accent: "bg-sun text-ink-950",
      surface: "border-2 border-border bg-surface text-fg",
    },
    size: {
      phone: "px-3.5 py-1.5 text-body",
      stage: "px-[26px] py-3 text-stage-body",
    },
  },
  defaultVariants: {
    variant: "solid",
    size: "stage",
  },
});

export type PillProps = ComponentProps<"span"> & VariantProps<typeof pillVariants>;

export const Pill = ({ variant, size, className, ...props }: PillProps) => (
  <span className={cn(pillVariants({ variant, size }), className)} {...props} />
);
