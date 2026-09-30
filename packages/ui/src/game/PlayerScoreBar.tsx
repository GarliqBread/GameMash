import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { Avatar } from "../primitives/Avatar.js";

export type PlayerScoreBarProps = Omit<ComponentProps<"div">, "children"> & {
  name: string;
  score: ReactNode;
  colorKey?: string | undefined;
  avatarSrc?: string | undefined;
};

export const PlayerScoreBar = ({ name, score, colorKey, avatarSrc, className, ...props }: PlayerScoreBarProps) => (
  <div className={cn("flex min-h-11 items-center justify-between gap-3", className)} {...props}>
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar name={name} size={36} colorKey={colorKey} src={avatarSrc} />
      <span className="truncate font-bold">{name}</span>
    </div>
    <span className="shrink-0 text-fg-muted">{score}</span>
  </div>
);
