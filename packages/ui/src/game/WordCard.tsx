import type { ComponentProps } from "react";
import { PencilIcon } from "../icons/icons.js";
import { cn } from "../lib/cn.js";

export type WordCardProps = ComponentProps<"div"> & {
  as?: "h1" | "h2" | "p" | undefined;
  showBadge?: boolean | undefined;
};

export const WordCard = ({ children, as: Word = "p", showBadge = true, className, ...props }: WordCardProps) => (
  <div
    className={cn(
      "relative max-w-full -rotate-2 rounded-panel bg-cream px-24 pt-10 pb-[52px] text-ink-950",
      "shadow-card-word",
      className,
    )}
    {...props}
  >
    {showBadge && (
      <span
        aria-hidden="true"
        className="absolute -top-9 -right-7 flex size-[72px] rotate-12 items-center justify-center rounded-full bg-sun"
      >
        <PencilIcon size={44} strokeWidth={1.8} />
      </span>
    )}
    <Word className="text-center font-display text-stage-word font-extrabold tracking-display-tight text-balance hyphens-auto wrap-break-word">
      {children}
    </Word>
  </div>
);
