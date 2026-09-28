import type { LineupEntry } from "@gamemash/shared";
import { isQuestionComplete, isQuestionTextValid, quizTimeRange } from "./pop-quiz/config.js";
import type { GameSetup, SessionSetup } from "./setup-schema.js";

export type { GameSetup, HostSetupResponse, SessionSetup } from "./setup-schema.js";

export const SESSION_NAME_MAX_LENGTH = 40;
export const MAX_GAMES = 10;

export const emptySetup = (): SessionSetup => ({ name: "", games: [] });

const isUnique = (ids: string[]) => new Set(ids).size === ids.length;

export const hasUniqueIds = (setup: SessionSetup) =>
  isUnique(setup.games.map((game) => game.id)) &&
  setup.games.every((game) => isUnique(game.config.questions.map((question) => question.id)));

export const hasValidText = (setup: SessionSetup) =>
  setup.games.every((game) => game.config.questions.every((question) => isQuestionTextValid(question.text)));

export const setupImageIds = (setup: SessionSetup) => [
  ...new Set(setup.games.flatMap((game) => game.config.questions.flatMap((question) => question.images))),
];

export const withoutImages = (setup: SessionSetup): SessionSetup => ({
  ...setup,
  games: setup.games.map((game) => ({
    ...game,
    config: { ...game.config, questions: game.config.questions.map((question) => ({ ...question, images: [] })) },
  })),
});

export const isGameReady = (game: GameSetup) =>
  game.config.questions.length > 0 && game.config.questions.every(isQuestionComplete);

export const isSetupReady = (setup: SessionSetup) => setup.games.length > 0 && setup.games.every(isGameReady);

export const summarizeGame = (game: GameSetup): LineupEntry => ({
  id: game.id,
  type: game.type,
  roundCount: game.config.questions.length,
  roundSeconds: quizTimeRange(game.config),
});
