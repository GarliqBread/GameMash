import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";

export type StageNoteProps = ComponentProps<"p"> & {
  icon: ReactNode;
};

export const StageNote = ({ icon, className, children, ...props }: StageNoteProps) => (
  <p className={cn("flex items-center gap-4 text-stage-body text-fg-muted", className)} {...props}>
    <span className="shrink-0 text-sun">{icon}</span>
    <span className="min-w-0">{children}</span>
  </p>
);
