import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentProps, ReactNode } from "react";
import { TrashIcon } from "../icons/icons.js";
import { cn } from "../lib/cn.js";

export type QuestionImageThumbnail = {
  id: string;
  url: string | undefined;
  alt: string;
};

export type QuestionImageStripProps = Omit<ComponentProps<"div">, "children"> & {
  images: QuestionImageThumbnail[];
  pendingCount: number;
  onRemove: (id: string) => void;
  removeLabel: (position: number) => string;
  pendingLabel: string;
  error?: ReactNode;
};

const TILE = "relative size-28 shrink-0 overflow-hidden rounded-key border-3 border-ink-950";

export const QuestionImageStrip = ({
  images,
  pendingCount,
  onRemove,
  removeLabel,
  pendingLabel,
  error,
  className,
  ...props
}: QuestionImageStripProps) => {
  if (images.length === 0 && pendingCount === 0 && !error) return null;
  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      <ul className="flex flex-wrap gap-3">
        {images.map((image, index) => (
          <li key={image.id} className={cn(TILE, "bg-paper-white shadow-brutal-sm")}>
            {image.url && <img src={image.url} alt={image.alt} className="size-full object-cover" />}
            <BaseButton
              onClick={() => onRemove(image.id)}
              aria-label={removeLabel(index + 1)}
              className={cn(
                "focus-ring absolute top-1.5 right-1.5 flex size-9 cursor-pointer items-center justify-center rounded-control",
                "border-2 border-ink-950 bg-paper-white text-ink-950 shadow-brutal-xs not-data-[disabled]:hover:bg-sun",
              )}
            >
              <TrashIcon size={16} strokeWidth={2.2} />
            </BaseButton>
          </li>
        ))}
        {Array.from({ length: pendingCount }, (_, index) => `pending-${images.length + index}`).map((key) => (
          <li
            key={key}
            className={cn(TILE, "border-dashed bg-surface-2 motion-safe:animate-pulse")}
            aria-busy="true"
            aria-label={pendingLabel}
          />
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-caption font-bold text-danger">
          {error}
        </p>
      )}
    </div>
  );
};
