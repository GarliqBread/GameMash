import type { SecondsRange } from "@gamemash/shared";

export type GameConfigRules<Config> = {
  isValid(config: Config): boolean;
  isReady(config: Config): boolean;
  imageIds(config: Config): string[];
  withoutImages(config: Config): Config;
  roundCount(config: Config): number;
  roundSeconds(config: Config): SecondsRange;
};
