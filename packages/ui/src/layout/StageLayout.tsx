import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";

export type StageLayoutProps = ComponentProps<"div"> & {
  header?: ReactNode;
  footer?: ReactNode;
  backdrop?: ReactNode;
  mainClassName?: string | undefined;
};

export const StageLayout = ({
  header,
  footer,
  backdrop,
  children,
  className,
  mainClassName,
  ...props
}: StageLayoutProps) => (
  <div
    className={cn(
      "bg-stage-dots relative flex size-full flex-col gap-10 overflow-hidden bg-bg px-24 pt-14 pb-16 font-sans text-stage-body text-fg",
      className,
    )}
    {...props}
  >
    {backdrop}
    {header && <header className="relative flex shrink-0 items-center justify-between gap-8">{header}</header>}
    <main className={cn("relative flex min-h-0 flex-1 flex-col", mainClassName)}>{children}</main>
    {footer && <footer className="relative flex shrink-0 items-center justify-between gap-8">{footer}</footer>}
  </div>
);
