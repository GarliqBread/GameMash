import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";

const stickerVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sticker border-2 border-ink-950 px-2 py-1 font-pixel tracking-pixel text-label-sm font-bold text-ink-950 shadow-brutal-sm",
  {
    variants: {
      tone: {
        sun: "bg-sun",
        coral: "bg-brand-coral",
        sky: "bg-brand-sky",
        white: "bg-paper-white",
        lime: "bg-brand-lime",
      },
    },
    defaultVariants: {
      tone: "sun",
    },
  },
);

export type StickerProps = ComponentProps<"span"> &
  VariantProps<typeof stickerVariants> & {
    rotate?: number | undefined;
    icon?: ReactNode;
  };

export const Sticker = ({ tone, rotate = 0, icon, className, style, children, ...props }: StickerProps) => (
  <span className={cn(stickerVariants({ tone }), className)} style={{ rotate: `${rotate}deg`, ...style }} {...props}>
    {icon}
    {children}
  </span>
);
