import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../lib/cn.js";

const sectionTabVariants = cva("m-0 self-start rounded-sticker font-pixel tracking-pixel font-bold", {
  variants: {
    variant: {
      default: "bg-ink-950 px-2.5 py-1 text-note/[1.3] text-cream",
      accent: "border-2 border-ink-950 bg-sun px-2 py-0.5 text-label text-ink-950",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type SectionTabProps = ComponentProps<"h2"> &
  VariantProps<typeof sectionTabVariants> & {
    as?: "h2" | "h3" | "span" | undefined;
  };

export const SectionTab = ({ as: Tag = "h2", variant, className, ...props }: SectionTabProps) => (
  <Tag className={cn(sectionTabVariants({ variant }), className)} {...props} />
);
