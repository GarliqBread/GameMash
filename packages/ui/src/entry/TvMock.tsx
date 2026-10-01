import type { ComponentProps } from "react";
import { ANSWER_SHAPES, ANSWERS } from "../lib/answers.js";
import { cn } from "../lib/cn.js";

const DROPS = ANSWER_SHAPES.map((shape) => ANSWERS[shape].drop);

const PhoneMock = ({ className }: { className: string }) => (
  <span
    className={cn(
      "absolute flex h-[88px] w-[50px] flex-col gap-[3px] rounded-key border-3 border-ink-950 bg-paper-white px-[5px] py-1.5",
      className,
    )}
  >
    {ANSWER_SHAPES.map((shape) => (
      <span
        key={shape}
        className={cn(
          "flex-1 rounded-bar",
          ANSWERS[shape].bg,
          shape === "plus" && "ring-[1.5px] ring-ink-950 ring-inset",
        )}
      />
    ))}
  </span>
);

export type TvMockProps = Omit<ComponentProps<"div">, "children"> & {
  title: string;
  code: string;
};

export const TvMock = ({ title, code, className, ...props }: TvMockProps) => (
  <div
    aria-hidden="true"
    className={cn(
      "relative h-[178px] shrink-0 overflow-hidden rounded-card border-3 border-ink-950 bg-brand-lime shadow-brutal-md",
      className,
    )}
    {...props}
  >
    <span className="absolute top-4 left-1/2 flex h-[112px] w-[188px] -translate-x-1/2 flex-col items-center justify-center gap-2 rounded-control border-3 border-ink-950 bg-ink-950">
      <span className="font-display text-label-sm font-extrabold text-cream">{title}</span>
      <span className="flex gap-[5px]">
        {[...code]
          .map((letter, position) => ({ letter, position }))
          .map((tile) => (
            <span
              key={tile.position}
              className={cn(
                "flex h-8 w-[26px] items-center justify-center rounded-sticker bg-cream font-display text-lead font-extrabold text-ink-950",
                DROPS[tile.position % DROPS.length],
              )}
            >
              {tile.letter}
            </span>
          ))}
      </span>
    </span>
    <span className="absolute top-[128px] left-1/2 h-3 w-5 -translate-x-1/2 bg-ink-950" />
    <span className="absolute top-[140px] left-1/2 h-1.5 w-20 -translate-x-1/2 rounded-full bg-ink-950" />
    <PhoneMock className="top-[54px] left-3.5 -rotate-9" />
    <PhoneMock className="top-[60px] right-3.5 rotate-8" />
  </div>
);
