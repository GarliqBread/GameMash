import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { EyeOffIcon, ShieldCheckIcon } from "../icons/icons.js";
import { cn } from "../lib/cn.js";

const trustNoteVariants = cva(
  "flex bg-surface text-fg-muted workshop:brutal workshop:rounded-field workshop:bg-brand-lime workshop:font-bold workshop:text-ink-950 workshop:shadow-brutal",
  {
    variants: {
      size: {
        phone:
          "items-start gap-3 rounded-field px-4 py-3.5 text-caption workshop:gap-2.5 workshop:px-3.5 workshop:py-3 workshop:text-sm/[1.45]",
        stage: "items-center gap-3 rounded-full border-2 border-border px-6 py-3.5 text-stage-caption",
      },
    },
    defaultVariants: {
      size: "phone",
    },
  },
);

const ICON_SIZES = { phone: 24, stage: 28 };

export type TrustNoteProps = ComponentProps<"div"> &
  VariantProps<typeof trustNoteVariants> & {
    icon?: "shield" | "eye-off" | undefined;
  };

export const TrustNote = ({ icon = "shield", size, className, children, ...props }: TrustNoteProps) => {
  const IconComponent = icon === "shield" ? ShieldCheckIcon : EyeOffIcon;
  return (
    <div className={cn(trustNoteVariants({ size }), className)} {...props}>
      <IconComponent size={ICON_SIZES[size ?? "phone"]} className="mt-px shrink-0 text-trust-icon" />
      <span className="min-w-0">{children}</span>
    </div>
  );
};
