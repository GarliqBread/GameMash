import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { EyeOffIcon, ShieldCheckIcon } from "../icons/icons.js";
import { cn } from "../lib/cn.js";

const trustNoteVariants = cva("flex", {
  variants: {
    size: {
      phone:
        "items-start gap-3 rounded-field bg-surface px-4 py-3.5 text-caption text-fg-muted workshop:brutal workshop:gap-2.5 workshop:bg-brand-lime workshop:px-3.5 workshop:py-3 workshop:text-sm/[1.45] workshop:font-bold workshop:text-ink-950 workshop:shadow-brutal",
      stage:
        "items-center gap-3 rounded-full border-2 border-border bg-surface px-6 py-3.5 text-stage-caption text-fg-muted",
      note: "items-center gap-2.5 rounded-control border-2 border-ink-950 px-3.5 py-2.5 text-sm/[1.35] font-bold text-ink-950",
      inline: "items-center gap-2 text-caption font-bold text-fg",
    },
    tone: {
      lime: "",
      white: "",
    },
  },
  compoundVariants: [
    { size: "note", tone: "lime", className: "bg-brand-lime" },
    { size: "note", tone: "white", className: "bg-paper-white" },
  ],
  defaultVariants: {
    size: "phone",
    tone: "lime",
  },
});

const ICON_SIZES = { phone: 24, stage: 28, note: 22, inline: 20 };

export type TrustNoteProps = ComponentProps<"div"> &
  VariantProps<typeof trustNoteVariants> & {
    icon?: "shield" | "eye-off" | undefined;
  };

export const TrustNote = ({ icon = "shield", size, tone, className, children, ...props }: TrustNoteProps) => {
  const IconComponent = icon === "shield" ? ShieldCheckIcon : EyeOffIcon;
  return (
    <div className={cn(trustNoteVariants({ size, tone }), className)} {...props}>
      <IconComponent
        size={ICON_SIZES[size ?? "phone"]}
        className={cn("shrink-0 text-trust-icon", (size ?? "phone") === "phone" && "mt-px")}
      />
      <span className="min-w-0">{children}</span>
    </div>
  );
};
