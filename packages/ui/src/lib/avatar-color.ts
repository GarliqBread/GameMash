type AvatarBackground = "bg-brand-orange" | "bg-brand-blue" | "bg-brand-yellow" | "bg-brand-teal";

export type AvatarColor = {
  bg: AvatarBackground;
  fg: "text-ink-950";
};

const AVATAR_BACKGROUNDS: AvatarBackground[] = ["bg-brand-orange", "bg-brand-blue", "bg-brand-yellow", "bg-brand-teal"];

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

const hash = (key: string) => {
  let value = FNV_OFFSET;
  for (const char of key) {
    value ^= char.codePointAt(0) ?? 0;
    value = Math.imul(value, FNV_PRIME);
  }
  return value >>> 0;
};

export const avatarColor = (key: string): AvatarColor => ({
  bg: AVATAR_BACKGROUNDS[hash(key) % AVATAR_BACKGROUNDS.length] ?? "bg-brand-orange",
  fg: "text-ink-950",
});
