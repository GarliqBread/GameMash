import { hasHiddenCharacters } from "@gamemash/shared";
import type { GameConfigRules } from "../game-config.js";
import { hasUniqueIds } from "../unique.js";
import type { DrawItConfig, DrawItWord } from "./schema.js";

export type { DrawItConfig, DrawItWord } from "./schema.js";

export const DRAW_IT_WORD_MAX_LENGTH = 40;
export const DRAW_IT_MAX_WORDS = 10;
export const DRAW_IT_DRAW_SECONDS = [30, 60, 90, 120];

export const DRAW_IT_MAX_STROKES = 500;
export const DRAW_IT_MAX_POINTS = 5000;
export const DRAW_IT_MAX_FILL_RINGS = 200;
export const DRAW_IT_UPLOAD_MAX_BYTES = 128 * 1024;
export const OWN_DRAWING_ID = "mine";

export const emptyWord = (id: string): DrawItWord => ({ id, text: "" });

export const defaultDrawItConfig = (firstWordId: string): DrawItConfig => ({
  words: [emptyWord(firstWordId)],
  drawSeconds: 60,
});

export const isWordValid = (word: DrawItWord) =>
  word.text.length <= DRAW_IT_WORD_MAX_LENGTH && !hasHiddenCharacters(word.text);

export const isWordComplete = (word: DrawItWord) => word.text.trim().length > 0;

export const drawItConfigRules: GameConfigRules<DrawItConfig> = {
  isValid: (config) => hasUniqueIds(config.words) && config.words.every(isWordValid),
  isReady: (config) => config.words.length > 0 && config.words.every(isWordComplete),
  imageIds: () => [],
  mapImages: (config) => config,
  withNewIds: (config, newId) => ({ ...config, words: config.words.map((word) => ({ ...word, id: newId() })) }),
  roundCount: (config) => config.words.length,
  roundSeconds: (config) => ({ min: config.drawSeconds, max: config.drawSeconds }),
};
