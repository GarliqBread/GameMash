import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";

export type PhoneShellProps = ComponentProps<"div"> & {
  theme: "stage" | "paper" | "workshop";
  header?: ReactNode;
  footer?: ReactNode;
  bottomAction?: ReactNode;
  isBottomActionSticky?: boolean | undefined;
  contentClassName?: string | undefined;
  mainClassName?: string | undefined;
};

export const PhoneShell = ({
  theme,
  header,
  footer,
  bottomAction,
  isBottomActionSticky = false,
  children,
  className,
  contentClassName,
  mainClassName,
  ...props
}: PhoneShellProps) => (
  <div
    data-theme={theme}
    className={cn("min-h-dvh bg-bg text-fg", theme === "workshop" && "bg-graph-paper", className)}
    {...props}
  >
    <div
      className={cn(
        "mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 font-sans text-body",
        "pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+24px)]",
        contentClassName,
      )}
    >
      {header && <header className="flex shrink-0 items-center justify-between gap-3">{header}</header>}
      <main className={cn("flex min-h-0 flex-1 flex-col gap-4", mainClassName)}>{children}</main>
      {footer && <footer className="shrink-0">{footer}</footer>}
      {bottomAction && (
        <div
          className={cn(
            "flex shrink-0 flex-col gap-3",
            isBottomActionSticky &&
              "sticky bottom-0 z-10 -mx-4 border-t border-border bg-bg px-4 py-3 workshop:mx-0 workshop:border-t-0 workshop:bg-transparent workshop:px-0 workshop:py-0",
          )}
        >
          {bottomAction}
        </div>
      )}
    </div>
  </div>
);
