import type { ComponentProps, CSSProperties } from "react";
import { ANSWERS, type AnswerShapeName } from "../lib/answers.js";
import { cn } from "../lib/cn.js";

type StickerSpec = {
  shape: AnswerShapeName;
  rotate: number;
  style: CSSProperties;
};

const PHONE_STICKERS: StickerSpec[] = [
  { shape: "squircle", rotate: -10, style: { left: "1.7%", top: "11.9%", width: "26.3%" } },
  { shape: "triangle", rotate: 8, style: { left: "27.4%", top: "1.7%", width: "24%" } },
  { shape: "plus", rotate: -6, style: { left: "51.4%", top: "25.4%", width: "22.9%" } },
  { shape: "dome", rotate: 12, style: { left: "74.9%", top: "6.8%", width: "25.1%" } },
];

const DESKTOP_STICKERS: StickerSpec[] = [
  { shape: "squircle", rotate: -12, style: { right: 150, bottom: 120, width: 190 } },
  { shape: "triangle", rotate: 10, style: { right: 10, bottom: 150, width: 170 } },
  { shape: "plus", rotate: 6, style: { right: 190, bottom: 0, width: 160 } },
  { shape: "dome", rotate: -8, style: { right: 30, bottom: 0, width: 180 } },
];

const VARIANTS = {
  phone: { stickers: PHONE_STICKERS, stroke: 1.1, offset: 1.3, box: "aspect-[350/118] w-full" },
  desktop: { stickers: DESKTOP_STICKERS, stroke: 0.8, offset: 1, box: "h-[330px] w-[380px]" },
};

const StickerShape = ({ spec, stroke, offset }: { spec: StickerSpec; stroke: number; offset: number }) => {
  const { path, text } = ANSWERS[spec.shape];
  return (
    <svg
      viewBox="-2 -2 28 28"
      aria-hidden="true"
      focusable="false"
      className={cn("absolute aspect-square h-auto", text)}
      style={{ ...spec.style, rotate: `${spec.rotate}deg` }}
    >
      <path d={path} transform={`translate(${offset} ${offset})`} className="fill-ink-950" />
      <path d={path} fill="currentColor" strokeWidth={stroke} strokeLinejoin="round" className="stroke-ink-950" />
    </svg>
  );
};

export type EntryHeroProps = Omit<ComponentProps<"div">, "children"> & {
  variant: "phone" | "desktop";
};

export const EntryHero = ({ variant, className, ...props }: EntryHeroProps) => {
  const { stickers, stroke, offset, box } = VARIANTS[variant];
  return (
    <div aria-hidden="true" className={cn("pointer-events-none relative shrink-0", box, className)} {...props}>
      {stickers.map((spec) => (
        <StickerShape key={spec.shape} spec={spec} stroke={stroke} offset={offset} />
      ))}
    </div>
  );
};
