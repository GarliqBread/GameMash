import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";

export type WorkshopShellProps = Omit<ComponentProps<"div">, "children"> & {
  header: ReactNode;
  lineup: ReactNode;
  editor: ReactNode;
  settings: ReactNode;
  lineupLabel: string;
  settingsLabel: string;
};

export const WorkshopShell = ({
  header,
  lineup,
  editor,
  settings,
  lineupLabel,
  settingsLabel,
  className,
  ...props
}: WorkshopShellProps) => (
  <div
    data-theme="workshop"
    className={cn("flex min-h-dvh flex-col bg-bg font-sans text-body text-fg", className)}
    {...props}
  >
    <header className="flex h-24 shrink-0 items-center gap-6 border-b-3 border-ink-950 bg-paper-white px-7">
      {header}
    </header>
    <div className="bg-graph-paper grid flex-1 grid-cols-[300px_minmax(0,1fr)] items-start gap-8 pt-7 pr-8 pb-8 pl-7 min-[1200px]:grid-cols-[300px_minmax(0,1fr)_340px]">
      <nav
        aria-label={lineupLabel}
        className="row-span-2 flex min-[1200px]:row-span-1 h-full min-h-0 flex-col gap-4 self-stretch"
      >
        {lineup}
      </nav>
      <main className="flex min-w-0 flex-col gap-5">{editor}</main>
      <aside aria-label={settingsLabel} className="flex min-w-0 flex-col">
        {settings}
      </aside>
    </div>
  </div>
);
