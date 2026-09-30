import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "bg-image": ["bg-stage-dots", "bg-graph-paper"],
    },
    theme: {
      font: ["display", "sans", "pixel"],
      tracking: ["pixel", "display", "display-tight"],
      text: [
        "key",
        "label",
        "title-sm",
        "title",
        "title-lg",
        "wordmark-lg",
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
        "tile-coral",
        "tile-violet",
        "tile-lime",
        "tile-sky",
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
