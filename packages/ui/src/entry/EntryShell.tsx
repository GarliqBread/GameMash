import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";

export type EntryShellProps = ComponentProps<"div"> & {
  logo: ReactNode;
  action: ReactNode;
  mainClassName?: string | undefined;
};

export const EntryShell = ({ logo, action, mainClassName, className, children, ...props }: EntryShellProps) => (
  <div
    data-theme="workshop"
    className={cn("bg-graph-paper flex min-h-dvh flex-col bg-bg font-sans text-body text-fg", className)}
    {...props}
  >
    <header className="flex h-[84px] shrink-0 items-center justify-between gap-6 border-b-3 border-ink-950 bg-paper-white px-14">
      {logo}
      {action}
    </header>
    <main className={cn("flex flex-1 items-stretch gap-14 px-14 pt-11 pb-12", mainClassName)}>{children}</main>
  </div>
);
