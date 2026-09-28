import type { GameDefinition, GameId } from "./definition.js";
import { drawIt } from "./draw-it/definition.js";
import { popQuiz } from "./pop-quiz/definition.js";

export type { GameDefinition, GameId } from "./definition.js";

export const GAMES: Record<GameId, GameDefinition> = {
  "pop-quiz": popQuiz,
  "draw-it": drawIt,
};

export const gameDefinition = (id: GameId) => GAMES[id];

export const isGameId = (value: string): value is GameId => Object.hasOwn(GAMES, value);
