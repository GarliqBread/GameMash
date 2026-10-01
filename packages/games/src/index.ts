import type { GameDefinition } from "./definition.js";
import { drawIt } from "./draw-it/definition.js";
import { popQuiz } from "./pop-quiz/definition.js";
import type { GameType } from "./setup.js";

export type { GameDefinition } from "./definition.js";

export const GAMES: Record<GameType, GameDefinition> = {
  "pop-quiz": popQuiz,
  "draw-it": drawIt,
};

export const gameDefinition = (id: GameType) => GAMES[id];

export const isGameId = (value: string): value is GameType => Object.hasOwn(GAMES, value);
