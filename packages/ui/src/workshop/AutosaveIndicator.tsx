import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";

export type AutosaveStatus = "saving" | "saved" | "error";

export type AutosaveIndicatorProps = Omit<ComponentProps<"span">, "children"> & {
  status: AutosaveStatus;
  labels: Record<AutosaveStatus, ReactNode>;
  onRetry?: (() => void) | undefined;
};

const DOT_CLASSES: Record<AutosaveStatus, string> = {
  saving: "bg-sand-200",
  saved: "bg-brand-teal",
  error: "bg-brand-orange",
};

export const AutosaveIndicator = ({ status, labels, onRetry, className, ...props }: AutosaveIndicatorProps) => (
  <span
    className={cn("flex items-center gap-1.5 font-pixel tracking-pixel text-xs text-fg-muted", className)}
    {...props}
  >
    <span
      aria-hidden="true"
      className={cn("size-2.5 shrink-0 rounded-full border-2 border-ink-950", DOT_CLASSES[status])}
    />
    {status === "error" && onRetry ? (
      <button type="button" onClick={onRetry} className="focus-ring cursor-pointer underline underline-offset-2">
        {labels.error}
      </button>
    ) : (
      labels[status]
    )}
  </span>
);
