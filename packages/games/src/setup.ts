import type { LineupEntry } from "@gamemash/shared";
import { isQuestionComplete } from "./pop-quiz/config.js";
import type { GameSetup, SessionSetup } from "./setup-schema.js";

export type { GameSetup, SessionSetup } from "./setup-schema.js";

export const SESSION_NAME_MAX_LENGTH = 40;
export const MAX_GAMES = 10;

export const emptySetup = (): SessionSetup => ({ name: "", games: [] });

const isUnique = (ids: string[]) => new Set(ids).size === ids.length;

export const hasUniqueIds = (setup: SessionSetup) =>
  isUnique(setup.games.map((game) => game.id)) &&
  setup.games.every((game) => isUnique(game.config.questions.map((question) => question.id)));

export const isGameReady = (game: GameSetup) =>
  game.config.questions.length > 0 && game.config.questions.every(isQuestionComplete);

export const isSetupReady = (setup: SessionSetup) => setup.games.length > 0 && setup.games.every(isGameReady);

export const summarizeGame = (game: GameSetup): LineupEntry => ({
  id: game.id,
  type: game.type,
  roundCount: game.config.questions.length,
  roundSeconds: game.config.timeLimitSeconds,
});
