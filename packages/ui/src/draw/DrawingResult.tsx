import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";
import type { Drawing } from "../lib/drawing.js";
import { DrawingFrame } from "./DrawingFrame.js";

type PodiumRank = 1 | 2 | 3;

const MEDALS: Record<PodiumRank, string> = {
  1: "bg-medal-gold",
  2: "bg-medal-silver",
  3: "bg-medal-bronze",
};

export type DrawingResultCardProps = Omit<ComponentProps<"li">, "children"> & {
  rank: PodiumRank;
  name: string;
  drawing: Drawing;
  drawingLabel: string;
  average: ReactNode;
  outOf: ReactNode;
  points: ReactNode;
  isUnrated?: boolean | undefined;
};

export const DrawingResultCard = ({
  rank,
  name,
  drawing,
  drawingLabel,
  average,
  outOf,
  points,
  isUnrated = false,
  className,
  ...props
}: DrawingResultCardProps) => (
  <li
    className={cn(
      "flex min-w-0 gap-6 rounded-tile border-[3px] bg-surface p-6",
      rank === 1 ? "border-sun" : "border-border",
      className,
    )}
    {...props}
  >
    <DrawingFrame drawing={drawing} label={drawingLabel} size={280} />
    <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
      <span
        className={cn(
          "flex size-[72px] items-center justify-center rounded-card font-display text-stage-xl font-extrabold text-ink-950",
          MEDALS[rank],
        )}
      >
        {rank}
      </span>
      <span className="truncate text-stage-lg/tight font-bold">{name}</span>
      {isUnrated ? (
        <span className="text-stage-body/tight font-bold text-balance text-fg-subtle">{average}</span>
      ) : (
        <span className="flex items-baseline gap-1.5">
          <span className="font-display text-stage-2xl/[1] font-extrabold tabular-nums">{average}</span>
          <span className="text-stage-caption text-fg-subtle">{outOf}</span>
        </span>
      )}
      <span className="self-start rounded-full bg-sun px-4 py-1.5 font-display text-stage-caption font-extrabold text-ink-950">
        {points}
      </span>
    </div>
  </li>
);

export type DrawingResultChipProps = Omit<ComponentProps<"li">, "children"> & {
  rank: ReactNode;
  name: string;
  drawing: Drawing;
  drawingLabel: string;
  average: ReactNode;
  isUnrated?: boolean | undefined;
};

export const DrawingResultChip = ({
  rank,
  name,
  drawing,
  drawingLabel,
  average,
  isUnrated = false,
  className,
  ...props
}: DrawingResultChipProps) => (
  <li
    className={cn("flex min-w-0 items-center gap-4 rounded-card border-2 border-border bg-surface p-3.5", className)}
    {...props}
  >
    <DrawingFrame drawing={drawing} label={drawingLabel} size={128} className="rounded-field" />
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-stage-caption text-fg-subtle">{rank}</span>
      <span className="truncate text-stage-caption font-bold">{name}</span>
      {isUnrated ? (
        <span className="text-stage-caption/tight font-bold text-balance text-fg-subtle">{average}</span>
      ) : (
        <span className="font-display text-stage-body font-extrabold tabular-nums">{average}</span>
      )}
    </div>
  </li>
);
