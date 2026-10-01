import type { ComponentProps, ReactNode } from "react";
import { DashIcon, TriangleDownIcon, TriangleUpIcon } from "../icons/icons.js";
import { cn } from "../lib/cn.js";
import { Avatar } from "../primitives/Avatar.js";
import { StagePanel } from "./StagePanel.js";

export type Movement = {
  direction: "up" | "down" | "same";
  amount?: number | undefined;
};

export type LeaderboardEntry = {
  id: string;
  rank: number;
  name: string;
  total: number;
  gain?: number | undefined;
  movement?: Movement | undefined;
  colorKey?: string | undefined;
  avatarSrc?: string | undefined;
};

export type MovementLabels = Record<Movement["direction"], (amount: number) => string>;

const MOVEMENT_ICONS = {
  up: TriangleUpIcon,
  down: TriangleDownIcon,
  same: DashIcon,
};

const MovementIndicator = ({ movement, labels }: { movement: Movement; labels: MovementLabels }) => {
  const MovementIcon = MOVEMENT_ICONS[movement.direction];
  const amount = movement.amount ?? 0;
  return (
    <>
      <MovementIcon size={22} />
      {movement.direction !== "same" && <span aria-hidden="true">{amount}</span>}
      <span className="sr-only">{labels[movement.direction](amount)}</span>
    </>
  );
};

type LeaderboardRowProps = Omit<ComponentProps<"li">, "children"> & {
  entry: LeaderboardEntry;
  formatNumber: (value: number) => string;
  movementLabels: MovementLabels;
};

const LeaderboardRow = ({ entry, formatNumber, movementLabels, className, ...props }: LeaderboardRowProps) => {
  const isLeader = entry.rank === 1;
  return (
    <li
      className={cn("flex h-[88px] items-center gap-[18px] rounded-card px-5", isLeader && "bg-surface-2", className)}
      {...props}
    >
      <span
        className={cn(
          "w-10 shrink-0 font-display text-stage-xl font-extrabold tabular-nums",
          isLeader ? "text-sun" : "text-fg-subtle",
        )}
      >
        {entry.rank}
      </span>
      <Avatar name={entry.name} size={60} colorKey={entry.colorKey} src={entry.avatarSrc} />
      <span className="min-w-0 flex-1 truncate text-stage-lg font-bold">{entry.name}</span>
      <span className="min-w-20 shrink-0 text-right text-stage-caption font-bold whitespace-nowrap text-sun tabular-nums">
        {entry.gain !== undefined && entry.gain > 0 ? `+${formatNumber(entry.gain)}` : null}
      </span>
      <span className="min-w-[120px] shrink-0 text-right font-display text-stage-lg font-extrabold whitespace-nowrap tabular-nums">
        {formatNumber(entry.total)}
      </span>
      <span
        className={cn(
          "flex min-w-14 shrink-0 items-center justify-end gap-0.5 text-stage-caption font-bold tabular-nums",
          entry.movement?.direction === "up" ? "text-fg" : "text-ink-400",
        )}
      >
        {entry.movement && <MovementIndicator movement={entry.movement} labels={movementLabels} />}
      </span>
    </li>
  );
};

export type LeaderboardProps = Omit<ComponentProps<"section">, "children" | "title"> & {
  entries: LeaderboardEntry[];
  formatNumber: (value: number) => string;
  title?: ReactNode;
  subtitle?: ReactNode;
  limit?: number | undefined;
  totalCount?: number | undefined;
  moreLabel?: ((hiddenCount: number) => ReactNode) | undefined;
  movementLabels: MovementLabels;
};

export const Leaderboard = ({
  entries,
  formatNumber,
  title,
  subtitle,
  limit,
  totalCount,
  moreLabel,
  movementLabels,
  className,
  ...props
}: LeaderboardProps) => {
  const visible = limit === undefined ? entries : entries.slice(0, limit);
  const hiddenCount = Math.max(totalCount ?? entries.length, entries.length) - visible.length;

  return (
    <StagePanel
      title={title}
      aside={subtitle && <span className="text-stage-caption text-fg-subtle">{subtitle}</span>}
      className={cn("gap-6", className)}
      {...props}
    >
      <ol className="flex flex-col gap-3.5">
        {visible.map((entry) => (
          <LeaderboardRow key={entry.id} entry={entry} formatNumber={formatNumber} movementLabels={movementLabels} />
        ))}
      </ol>
      {hiddenCount > 0 && moreLabel && (
        <span className="pl-5 text-stage-caption text-fg-subtle">{moreLabel(hiddenCount)}</span>
      )}
    </StagePanel>
  );
};
