import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import type { ComponentProps } from "react";
import { avatarColor } from "../lib/avatar-color.js";
import { cn } from "../lib/cn.js";

export type AvatarSize = 36 | 60 | 80 | 112 | 140;
export type AvatarRing = "gold" | "silver" | "bronze";

const SIZE_CLASSES: Record<AvatarSize, string> = {
  36: "size-9 text-control/[1]",
  60: "size-[60px] text-heading/[1]",
  80: "size-20 text-heading-lg/[1]",
  112: "size-28 text-monogram",
  140: "size-[140px] text-monogram-lg",
};

const RING_CLASSES: Record<AvatarRing, string> = {
  gold: "ring-medal-gold",
  silver: "ring-medal-silver",
  bronze: "ring-medal-bronze",
};

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

const initial = (name: string) => {
  const [first] = graphemes.segment(name.trim());
  return first ? first.segment.toLocaleUpperCase() : "";
};

export type AvatarProps = Omit<ComponentProps<"span">, "children"> & {
  name: string;
  colorKey?: string | undefined;
  src?: string | undefined;
  alt?: string | undefined;
  size?: AvatarSize | undefined;
  ring?: AvatarRing | undefined;
};

export const Avatar = ({ name, colorKey, src, alt = "", size = 80, ring, className, ...props }: AvatarProps) => {
  const color = avatarColor(colorKey ?? name);
  return (
    <BaseAvatar.Root
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-display font-extrabold",
        color.bg,
        color.fg,
        SIZE_CLASSES[size],
        ring && ["ring-4 ring-offset-[5px] ring-offset-bg", RING_CLASSES[ring]],
        className,
      )}
      {...props}
    >
      {src && <BaseAvatar.Image src={src} alt={alt} className="size-full object-cover" />}
      <BaseAvatar.Fallback aria-hidden="true">{initial(name)}</BaseAvatar.Fallback>
    </BaseAvatar.Root>
  );
};
