import { Dialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { Avatar } from "../primitives/Avatar.js";
import { keyButtonClassName } from "../workshop/KeyButton.js";

export type RosterPlayer = {
  id: string;
  name: string;
  colorKey?: string | undefined;
  avatarSrc?: string | undefined;
};

export type PlayerRosterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  players: RosterPlayer[];
  removeText: ReactNode;
  removeLabel: (name: string) => string;
  onRemove: (playerId: string) => void;
  closeLabel: ReactNode;
};

export const PlayerRosterDialog = ({
  open,
  onOpenChange,
  title,
  players,
  removeText,
  removeLabel,
  onRemove,
  closeLabel,
}: PlayerRosterDialogProps) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 bg-ink-950/40" />
      <Dialog.Popup
        data-theme="workshop"
        className="fixed top-1/2 left-1/2 flex max-h-[80dvh] w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-card border-3 border-ink-950 bg-paper-white p-6 text-ink-950 shadow-brutal-xl"
      >
        <Dialog.Title className="font-display text-2xl font-extrabold">{title}</Dialog.Title>
        <ul className="-mx-2 flex min-h-0 flex-col gap-1 overflow-y-auto px-2">
          {players.map((player) => (
            <li key={player.id} className="group flex min-w-0 items-center gap-3 py-1.5">
              <Avatar name={player.name} colorKey={player.colorKey} src={player.avatarSrc} size={36} />
              <span className="min-w-0 flex-1 truncate text-body font-bold">{player.name}</span>
              <button
                type="button"
                aria-label={removeLabel(player.name)}
                onClick={() => onRemove(player.id)}
                className={cn(
                  keyButtonClassName,
                  "h-10 shrink-0 px-4 text-caption",
                  "opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100",
                )}
              >
                {removeText}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <Dialog.Close className={cn(keyButtonClassName, "h-12 px-5 text-base")}>{closeLabel}</Dialog.Close>
        </div>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>
);
