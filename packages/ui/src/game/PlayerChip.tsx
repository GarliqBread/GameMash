import type { ComponentProps } from "react";
import { CheckIcon, PencilIcon } from "../icons/icons.js";
import { cn } from "../lib/cn.js";
import { Avatar } from "../primitives/Avatar.js";

type ChipState =
  | { state: "joined"; statusLabel?: undefined }
  | { state: "waiting"; statusLabel?: undefined }
  | { state: "done" | "drawing"; statusLabel: string };

export type PlayerChipState = ChipState["state"];

export type PlayerChipProps = Omit<ComponentProps<"div">, "children"> &
  ChipState & {
    name: string;
    colorKey?: string | undefined;
    avatarSrc?: string | undefined;
  };

const STATE_CLASSES: Record<PlayerChipState, string> = {
  joined: "h-[88px] gap-[18px]",
  waiting: "h-[88px] gap-[18px] text-ink-400",
  done: "h-[68px] gap-3 rounded-button border-2 border-success bg-success px-4 text-ink-950",
  drawing: "h-[68px] gap-3 rounded-button border-2 border-border px-4 text-fg-subtle",
};

export const PlayerChip = ({ state, name, colorKey, avatarSrc, statusLabel, className, ...props }: PlayerChipProps) => {
  const StatusIcon = state === "done" ? CheckIcon : PencilIcon;

  return (
    <div className={cn("flex min-w-0 items-center", STATE_CLASSES[state], className)} {...props}>
      {state === "joined" && <Avatar name={name} size={80} colorKey={colorKey} src={avatarSrc} />}
      {state === "waiting" && (
        <span
          aria-hidden="true"
          className="size-[76px] shrink-0 rounded-full border-[3px] border-dashed border-border-strong"
        />
      )}
      {statusLabel && (
        <>
          <StatusIcon size={26} className="shrink-0" />
          <span className="sr-only">{statusLabel}</span>
        </>
      )}
      <span
        className={cn(
          "min-w-0 truncate",
          state === "joined" && "text-stage-lg font-bold",
          state === "waiting" && "text-stage-body",
          statusLabel && "text-stage-caption font-bold",
        )}
      >
        {name}
      </span>
    </div>
  );
};
