import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "bg-image": ["bg-stage-dots", "bg-graph-paper"],
    },
    theme: {
      font: ["display", "sans", "pixel"],
      tracking: ["pixel"],
      text: [
        "key",
        "caption",
        "body",
        "stage-caption",
        "stage-body",
        "stage-lg",
        "stage-xl",
        "stage-2xl",
        "stage-3xl",
        "stage-4xl",
        "stage-display",
        "stage-word",
      ],
      radius: ["control", "field", "button", "card", "tile", "panel", "sticker", "key"],
      shadow: [
        "press-sun",
        "press-sm",
        "card-stage",
        "knob",
        "primary",
        "primary-sm",
        "tile-orange",
        "tile-blue",
        "tile-yellow",
        "tile-teal",
        "card-word",
        "brutal-xs",
        "brutal-sm",
        "brutal",
        "brutal-md",
        "brutal-lg",
        "brutal-xl",
      ],
      animate: ["pop-in", "timer-pulse"],
    },
  },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
