import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { Sticker } from "../workshop/Sticker.js";

export type GameAccent = "sun" | "brand-orange" | "brand-blue" | "brand-teal";

const ACCENT_FILL: Record<GameAccent, string> = {
  sun: "bg-sun",
  "brand-orange": "bg-brand-orange",
  "brand-blue": "bg-brand-blue",
  "brand-teal": "bg-brand-teal",
};

const gripStripe = (accent: GameAccent) =>
  `repeating-linear-gradient(90deg, var(--color-${accent}) 0 8px, var(--color-ink-950) 8px 11px)`;

export type GameCartridgeProps = Omit<ComponentProps<"div">, "children" | "title" | "onSelect"> & {
  title: string;
  eyebrow: ReactNode;
  accent: GameAccent;
  icon: ReactNode;
  metaChips: string[];
  isSelected: boolean;
  onSelect: () => void;
  editingLabel: ReactNode;
  dragHandleLabel: string;
  handleRef?: ((element: Element | null) => void) | undefined;
  isDragging?: boolean | undefined;
};

export const GameCartridge = ({
  title,
  eyebrow,
  accent,
  icon,
  metaChips,
  isSelected,
  onSelect,
  editingLabel,
  dragHandleLabel,
  handleRef,
  isDragging = false,
  className,
  ...props
}: GameCartridgeProps) => (
  <div
    className={cn(
      "relative rounded-card border-3 border-ink-950 bg-paper-white text-ink-950 motion-safe:transition-[rotate,box-shadow]",
      isSelected ? "-rotate-1 shadow-brutal-lg" : "shadow-brutal",
      isDragging && "shadow-brutal-xl",
      className,
    )}
    {...props}
  >
    <button
      ref={handleRef}
      type="button"
      aria-label={dragHandleLabel}
      className="focus-ring relative block h-4 w-full cursor-grab touch-none rounded-t-[calc(var(--radius-card)-3px)] border-b-3 border-ink-950 before:absolute before:-inset-y-3 before:inset-x-0 active:cursor-grabbing"
      style={{ background: gripStripe(accent) }}
    />
    <button
      type="button"
      aria-current={isSelected ? "true" : undefined}
      onClick={onSelect}
      className="focus-ring flex w-full cursor-pointer gap-3.5 rounded-b-[calc(var(--radius-card)-3px)] p-3.5 text-left"
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-16 shrink-0 items-center justify-center rounded-control border-3 border-ink-950",
          ACCENT_FILL[accent],
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="font-pixel tracking-pixel text-xs text-fg-subtle">{eyebrow}</span>
        <span className="font-display text-title leading-none font-extrabold wrap-break-word">{title}</span>
        {metaChips.length > 0 && (
          <span className="flex flex-wrap gap-1.5">
            {metaChips.map((chip) => (
              <span
                key={chip}
                className="rounded-sticker border-2 border-ink-950 bg-cream px-[7px] py-0.5 font-pixel tracking-pixel text-xs"
              >
                {chip}
              </span>
            ))}
          </span>
        )}
      </span>
    </button>
    {isSelected && (
      <Sticker aria-hidden="true" tone="orange" rotate={6} className="pointer-events-none absolute -top-3.5 -right-3.5">
        {editingLabel}
      </Sticker>
    )}
  </div>
);
