import { drawItRules } from "./draw-it/rules.js";
import { popQuizRules } from "./pop-quiz/rules.js";
import type { GameRules } from "./rules.js";

export { type DrawItState, drawItRules } from "./draw-it/rules.js";
export { popQuizRules, type QuizState } from "./pop-quiz/rules.js";

export const gameRules: GameRules[] = [popQuizRules, drawItRules];
