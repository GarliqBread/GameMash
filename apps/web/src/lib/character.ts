import { Avatar, Style } from "@dicebear/core";
import croodles from "@dicebear/styles/croodles.json" with { type: "json" };
import type { Character } from "@gamemash/shared";

type Parts = typeof croodles.components;
type VariantOf<Part extends keyof Parts> = keyof Parts[Part]["variants"];

const MAX_CACHED_SOURCES = 200;

const style = new Style(croodles);
const TOP_COLORS = croodles.colors.top.values;
const sources = new Map<string, string>();

export const CHARACTER_CREDIT = {
  creator: croodles.meta.creator.name,
  sourceUrl: croodles.meta.source.url,
  license: croodles.meta.license.name,
  licenseUrl: croodles.meta.license.url,
};

const variantsOf = <Part extends keyof Parts>(part: Part) =>
  Object.keys(croodles.components[part].variants) as VariantOf<Part>[];

const VARIANTS = {
  head: variantsOf("head"),
  eyes: variantsOf("eyes"),
  nose: variantsOf("nose"),
  mouth: variantsOf("mouth"),
  top: variantsOf("top"),
  beard: variantsOf("beard"),
  mustache: variantsOf("mustache"),
};

const pick = <Variant>(variants: Variant[], index: number) => {
  const variant = variants[index];
  if (variant === undefined) throw new Error(`unknown character part ${index}`);
  return variant;
};

const render = (character: Character) =>
  new Avatar(style, {
    headVariant: pick(VARIANTS.head, character.head),
    eyesVariant: pick(VARIANTS.eyes, character.eyes),
    noseVariant: pick(VARIANTS.nose, character.nose),
    mouthVariant: pick(VARIANTS.mouth, character.mouth),
    topVariant: pick(VARIANTS.top, character.top),
    topColor: pick(TOP_COLORS, character.topColor),
    beardVariant: pick(VARIANTS.beard, character.beard ?? 0),
    beardProbability: character.beard === null ? 0 : 100,
    mustacheVariant: pick(VARIANTS.mustache, character.mustache ?? 0),
    mustacheProbability: character.mustache === null ? 0 : 100,
  }).toDataUri();

const remember = (key: string, src: string) => {
  sources.set(key, src);
  const [oldest] = sources.keys();
  if (sources.size > MAX_CACHED_SOURCES && oldest !== undefined) sources.delete(oldest);
};

export const characterSrc = (character: Character) => {
  const key = JSON.stringify(character);
  const cached = sources.get(key);
  if (cached) {
    sources.delete(key);
    sources.set(key, cached);
    return cached;
  }
  const src = render(character);
  remember(key, src);
  return src;
};
