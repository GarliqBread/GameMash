import { popQuizRules } from "./pop-quiz/rules.js";
import type { GameRules } from "./rules.js";

export { popQuizRules, type QuizState } from "./pop-quiz/rules.js";

export const gameRules: GameRules[] = [popQuizRules];
