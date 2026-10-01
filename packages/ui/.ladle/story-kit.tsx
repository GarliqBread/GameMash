import type { ReactNode } from "react";

type Theme = "paper" | "stage" | "workshop";

const THEMES: Theme[] = ["paper", "stage", "workshop"];

const GRID_COLUMNS = ["", "", "lg:grid-cols-2", "lg:grid-cols-3"];

export const ThemeMatrix = ({
  children,
  themes = THEMES,
}: {
  children: (theme: Theme) => ReactNode;
  themes?: Theme[];
}) => (
  <div className={`grid gap-px bg-ink-400 ${GRID_COLUMNS[themes.length] ?? ""}`}>
    {themes.map((theme) => (
      <section
        key={theme}
        data-theme={theme}
        className={
          theme === "workshop"
            ? "bg-graph-paper flex min-w-0 flex-col gap-6 bg-bg p-8 text-body text-fg"
            : "flex min-w-0 flex-col gap-6 bg-bg p-8 text-body text-fg"
        }
      >
        <h2 className="text-caption font-bold tracking-[0.08em] text-fg-subtle uppercase">{theme}</h2>
        {children(theme)}
      </section>
    ))}
  </div>
);

export const Row = ({ children, label }: { children: ReactNode; label?: string }) => (
  <div className="flex flex-col gap-3">
    {label && <span className="text-caption text-fg-subtle">{label}</span>}
    <div className="flex flex-wrap items-center gap-4">{children}</div>
  </div>
);

export const Frame = ({ width, children }: { width: number; children: ReactNode }) => (
  <div className="max-w-full" style={{ width }}>
    {children}
  </div>
);

export const StageFrame = ({ children, width = 1728 }: { children: ReactNode; width?: number }) => (
  <div data-theme="stage" className="bg-stage-dots min-h-dvh bg-bg p-12 text-stage-body text-fg">
    <div className="flex flex-col gap-12" style={{ width }}>
      {children}
    </div>
  </div>
);

export const Caption = ({ children }: { children: ReactNode }) => (
  <span className="text-caption font-bold tracking-[0.08em] text-fg-subtle uppercase">{children}</span>
);

export const PLAYER_NAMES = ["Anouk", "Bram", "Sophie", "Daan", "Priya", "Lars", "Fatima", "Jeroen", "Mei"];

export const LONG_NAMES = [
  "Maximilian Oberhuber-Schwarzenberg",
  "Anne-Sophie van der Berg-Hoogendoorn",
  "Bartholomeus Wijnandus",
  "Guðmundur Sigurðsson",
];
