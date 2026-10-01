import type { Character } from "./schemas.js";

export type { Character } from "./schemas.js";

export type CharacterPart = "head" | "eyes" | "nose" | "mouth" | "top" | "topColor" | "beard" | "mustache";

export const CHARACTER_PART_COUNTS: Record<CharacterPart, number> = {
  head: 8,
  eyes: 16,
  nose: 9,
  mouth: 18,
  top: 29,
  topColor: 6,
  beard: 5,
  mustache: 4,
};

const FACIAL_HAIR_CHANCE = 0.1;

const pick = (part: CharacterPart, random: () => number) => Math.floor(random() * CHARACTER_PART_COUNTS[part]);

const maybePick = (part: CharacterPart, random: () => number) =>
  random() < FACIAL_HAIR_CHANCE ? pick(part, random) : null;

export const randomCharacter = (random: () => number = Math.random): Character => ({
  head: pick("head", random),
  eyes: pick("eyes", random),
  nose: pick("nose", random),
  mouth: pick("mouth", random),
  top: pick("top", random),
  topColor: pick("topColor", random),
  beard: maybePick("beard", random),
  mustache: maybePick("mustache", random),
});
