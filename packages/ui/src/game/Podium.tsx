import type { ComponentProps } from "react";
import { CrownIcon } from "../icons/icons.js";
import { cn } from "../lib/cn.js";
import { gridColumns } from "../lib/grid.js";
import { Avatar, type AvatarRing } from "../primitives/Avatar.js";

export type RankedPlayer = {
  id: string;
  rank: number;
  name: string;
  score: number;
  colorKey?: string | undefined;
  avatarSrc?: string | undefined;
};

type PodiumRank = 1 | 2 | 3;

type PodiumPlace = {
  ring: AvatarRing;
  order: string;
  width: string;
  block: string;
  score: string;
};

const PLACES: Record<PodiumRank, PodiumPlace> = {
  1: {
    ring: "gold",
    order: "order-2",
    width: "w-[420px]",
    block: "h-[220px] bg-medal-gold text-stage-display/[1]",
    score: "text-sun",
  },
  2: {
    ring: "silver",
    order: "order-1",
    width: "w-[380px]",
    block: "h-[160px] bg-medal-silver text-stage-4xl/[1]",
    score: "text-fg-muted",
  },
  3: {
    ring: "bronze",
    order: "order-3",
    width: "w-[380px]",
    block: "h-[110px] bg-medal-bronze text-stage-4xl/[1]",
    score: "text-fg-muted",
  },
};

const isOnPodium = (player: RankedPlayer): player is RankedPlayer & { rank: PodiumRank } =>
  player.rank === 1 || player.rank === 2 || player.rank === 3;

export type PodiumProps = Omit<ComponentProps<"ol">, "children"> & {
  players: RankedPlayer[];
  formatNumber: (value: number) => string;
  rankLabel: (rank: number) => string;
};

export const Podium = ({ players, formatNumber, rankLabel, className, ...props }: PodiumProps) => (
  <ol className={cn("flex items-end justify-center gap-7", className)} {...props}>
    {players
      .filter(isOnPodium)
      .toSorted((a, b) => a.rank - b.rank)
      .map((player) => {
        const place = PLACES[player.rank];
        return (
          <li key={player.id} className={cn("flex min-w-0 flex-col items-center gap-3", place.order, place.width)}>
            <span className="sr-only">{rankLabel(player.rank)}</span>
            {player.rank === 1 && <CrownIcon size={48} className="text-sun" />}
            <Avatar name={player.name} size={112} ring={place.ring} colorKey={player.colorKey} src={player.avatarSrc} />
            <span className="max-w-full truncate text-stage-xl/tight font-bold">{player.name}</span>
            <span className={cn("font-display text-stage-lg/tight font-extrabold tabular-nums", place.score)}>
              {formatNumber(player.score)}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "flex w-full justify-center rounded-t-tile pt-4 font-display font-extrabold text-ink-950",
                place.block,
              )}
            >
              {player.rank}
            </span>
          </li>
        );
      })}
  </ol>
);

export type RankChipProps = Omit<ComponentProps<"li">, "children"> & {
  player: RankedPlayer;
  formatNumber: (value: number) => string;
};

export const RankChip = ({ player, formatNumber, className, ...props }: RankChipProps) => (
  <li
    className={cn(
      "flex min-w-0 items-center gap-3.5 rounded-card border-2 border-border bg-surface px-5 py-4",
      className,
    )}
    {...props}
  >
    <span className="font-display text-stage-body font-extrabold text-fg-subtle tabular-nums">{player.rank}</span>
    <span className="min-w-0 flex-1 truncate text-stage-body font-bold">{player.name}</span>
    <span className="font-display text-stage-caption font-bold text-fg-muted tabular-nums">
      {formatNumber(player.score)}
    </span>
  </li>
);

export type RankChipListProps = Omit<ComponentProps<"ol">, "children"> & {
  players: RankedPlayer[];
  formatNumber: (value: number) => string;
  columns?: number | undefined;
};

export const RankChipList = ({ players, formatNumber, columns = 6, className, style, ...props }: RankChipListProps) => (
  <ol className={cn("grid gap-4", className)} style={{ ...gridColumns(columns), ...style }} {...props}>
    {players.map((player) => (
      <RankChip key={player.id} player={player} formatNumber={formatNumber} />
    ))}
  </ol>
);
