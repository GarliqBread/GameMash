import type { ComponentProps } from "react";
import { cn } from "../lib/cn.js";

const TILE_DROPS = ["shadow-tile-orange", "shadow-tile-blue", "shadow-tile-yellow", "shadow-tile-teal"];

const codeTiles = (code: string) =>
  [...code].map((letter, position) => ({
    letter,
    slot: `slot-${position}`,
    drop: TILE_DROPS[position % TILE_DROPS.length],
  }));

export const spellOut = (code: string) => [...code].join(" ");

export type RoomCodeDisplayProps = Omit<ComponentProps<"div">, "children"> & {
  code: string;
  label: string;
};

export const RoomCodeDisplay = ({ code, label, className, ...props }: RoomCodeDisplayProps) => (
  <div role="img" aria-label={label} className={cn("flex gap-5", className)} {...props}>
    {codeTiles(code).map((tile) => (
      <span
        key={tile.slot}
        aria-hidden="true"
        className={cn(
          "flex h-[208px] w-[172px] items-center justify-center rounded-tile bg-cream font-display text-stage-display font-extrabold text-ink-950",
          tile.drop,
        )}
      >
        {tile.letter}
      </span>
    ))}
  </div>
);
