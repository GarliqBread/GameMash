import type { SecondsRange } from "@gamemash/shared";

export type ImageIdMap = (imageId: string) => string | null;

export type GameConfigRules<Config> = {
  isValid(config: Config): boolean;
  isReady(config: Config): boolean;
  imageIds(config: Config): string[];
  mapImages(config: Config, map: ImageIdMap): Config;
  withNewIds(config: Config, newId: () => string): Config;
  roundCount(config: Config): number;
  roundSeconds(config: Config): SecondsRange;
};
