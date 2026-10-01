import { Menu } from "@base-ui/react/menu";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { GAME_ACCENT_FILL, type GameAccent } from "../lib/game-accent.js";

export type GamePickerOption = {
  id: string;
  title: string;
  description?: ReactNode;
  accent: GameAccent;
  icon: ReactNode;
};

export type GamePickerProps = {
  trigger: ReactElement;
  options: GamePickerOption[];
  onPick: (id: string) => void;
  disabled?: boolean | undefined;
};

export const GamePicker = ({ trigger, options, onPick, disabled }: GamePickerProps) => (
  <Menu.Root disabled={disabled}>
    <Menu.Trigger render={trigger} />
    <Menu.Portal>
      <Menu.Positioner side="bottom" align="start" sideOffset={10}>
        <Menu.Popup
          data-theme="workshop"
          className="flex w-[min(92vw,360px)] flex-col gap-2 rounded-card border-3 border-ink-950 bg-paper-white p-2.5 text-ink-950 shadow-brutal-xl outline-none"
        >
          {options.map((option) => (
            <Menu.Item
              key={option.id}
              onClick={() => onPick(option.id)}
              className={cn(
                "flex cursor-pointer items-center gap-3.5 rounded-control border-3 border-transparent p-2 outline-none",
                "data-[highlighted]:border-ink-950 data-[highlighted]:bg-cream",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-14 shrink-0 items-center justify-center rounded-control border-3 border-ink-950",
                  GAME_ACCENT_FILL[option.accent],
                )}
              >
                {option.icon}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-display text-title-sm leading-tight font-extrabold wrap-break-word">
                  {option.title}
                </span>
                {option.description && <span className="text-caption text-fg-muted">{option.description}</span>}
              </span>
            </Menu.Item>
          ))}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  </Menu.Root>
);
