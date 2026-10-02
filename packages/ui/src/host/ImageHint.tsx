import type { ReactNode } from "react";
import { CloseIcon, ImageIcon } from "../icons/icons.js";

export type ImageHintProps = {
  label: ReactNode;
  hint: string;
  removeLabel: string;
  onRemove: () => void;
};

export const ImageHint = ({ label, hint, removeLabel, onRemove }: ImageHintProps) => (
  <p className="flex max-w-full items-center gap-2 self-start rounded-sticker border-2 border-dashed border-ink-950 bg-cream py-1 pr-1 pl-2.5 text-caption text-ink-950">
    <ImageIcon size={16} strokeWidth={2.2} className="shrink-0" />
    <span className="min-w-0 wrap-break-word">
      <span className="font-bold">{label}</span> {hint}
    </span>
    <button
      type="button"
      aria-label={removeLabel}
      onClick={onRemove}
      className="focus-ring flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-control hover:bg-ink-950/10"
    >
      <CloseIcon size={14} strokeWidth={2.6} />
    </button>
  </p>
);
