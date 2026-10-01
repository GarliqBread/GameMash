import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn.js";

export const workshopKeyClassName =
  "workshop:brutal workshop:rounded-key workshop:bg-paper-white workshop:text-ink-950 workshop:shadow-brutal workshop:font-display workshop:font-extrabold workshop:motion-safe:transition-[translate,transform,box-shadow,background-color] workshop:not-data-[disabled]:active:brutal-pressed workshop:data-[pressed]:bg-sun workshop:data-[pressed]:brutal-pressed workshop:aria-pressed:bg-sun workshop:aria-pressed:brutal-pressed workshop:aria-selected:bg-sun workshop:aria-selected:brutal-pressed workshop:data-[active]:bg-sun workshop:data-[active]:brutal-pressed";

const keyButtonVariants = cva(
  [
    "focus-ring inline-flex cursor-pointer items-center justify-center text-key data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
    workshopKeyClassName,
  ],
  {
    variants: {
      size: {
        square: "size-12",
        sm: "h-10 px-4 text-caption",
        md: "h-12 px-5 text-control",
      },
    },
    defaultVariants: { size: "square" },
  },
);

export type KeyButtonSize = NonNullable<VariantProps<typeof keyButtonVariants>["size"]>;

export const keyButtonClassName = ({ size }: { size?: KeyButtonSize | undefined } = {}) =>
  cn(keyButtonVariants({ size }));

export const dialogBackdropClassName = "fixed inset-0 bg-ink-950/40";

export const dialogPopupClassName =
  "fixed top-1/2 left-1/2 flex w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-card border-3 border-ink-950 bg-paper-white p-6 text-ink-950 shadow-brutal-xl";

export const dialogTitleClassName = "font-display text-heading-sm font-extrabold";
