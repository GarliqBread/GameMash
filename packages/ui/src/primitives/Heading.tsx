import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../lib/cn.js";

const headingVariants = cva("font-display font-extrabold text-balance", {
  variants: {
    size: {
      "stage-hero": "text-stage-4xl/[1.08] tracking-display",
      "stage-title": "text-stage-3xl/[1] tracking-display-tight",
      "stage-section": "text-stage-xl/[1.1]",
      "stage-sub": "text-stage-2xl/[1.05] tracking-display",
      phone: "text-4xl/[1.05] tracking-display",
      "phone-sm": "text-3xl/[1.1]",
      host: "text-3xl/[1.1] tracking-[-0.01em] workshop:text-stage-xl/[1] workshop:tracking-display-tight",
      panel: "text-2xl/[1.2]",
    },
  },
  defaultVariants: {
    size: "phone",
  },
});

export type HeadingProps = ComponentProps<"h1"> &
  VariantProps<typeof headingVariants> & {
    as?: "h1" | "h2" | "h3" | undefined;
  };

export const Heading = ({ as: Tag = "h1", size, className, ...props }: HeadingProps) => (
  <Tag className={cn(headingVariants({ size }), className)} {...props} />
);
