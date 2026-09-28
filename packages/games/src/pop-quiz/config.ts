import { hasHiddenCharacters } from "@gamemash/shared";
import type { PopQuizConfig, QuizQuestion, QuizText } from "./schema.js";

export type { PopQuizConfig, QuizQuestion, QuizText, QuizTextRun } from "./schema.js";

export const POP_QUIZ_QUESTION_MAX_LENGTH = 90;
export const POP_QUIZ_TEXT_MAX_RUNS = 40;
export const POP_QUIZ_ANSWER_MAX_LENGTH = 40;
export const POP_QUIZ_MAX_QUESTIONS = 50;
export const POP_QUIZ_MAX_IMAGES_PER_QUESTION = 9;
export const POP_QUIZ_TIME_LIMITS = [10, 20, 30, 60, 120];

export type QuizPointLevel = "standard" | "double";
export const POP_QUIZ_POINT_LEVELS: QuizPointLevel[] = ["standard", "double"];
export const POP_QUIZ_POINTS: Record<QuizPointLevel, number> = { standard: 1000, double: 2000 };

export type QuizAnswerKey = "squircle" | "triangle" | "plus" | "dome";
export const QUIZ_ANSWER_KEYS: QuizAnswerKey[] = ["squircle", "triangle", "plus", "dome"];

export const emptyQuestion = (id: string): QuizQuestion => ({
  id,
  text: [],
  images: [],
  answers: { squircle: "", triangle: "", plus: "", dome: "" },
  correct: null,
  timeLimitSeconds: null,
  points: "standard",
});

export const defaultPopQuizConfig = (firstQuestionId: string): PopQuizConfig => ({
  questions: [emptyQuestion(firstQuestionId)],
  timeLimitSeconds: 20,
  speedBonus: true,
  leaderboardAfterEachQuestion: true,
  shuffleAnswers: false,
});

export const quizPlainText = (text: QuizText) => text.map((run) => run.text).join("");

export const questionTimeLimit = (config: PopQuizConfig, question: QuizQuestion) =>
  question.timeLimitSeconds ?? config.timeLimitSeconds;

export const quizTimeRange = (config: PopQuizConfig) => {
  const times = config.questions.map((question) => questionTimeLimit(config, question));
  if (times.length === 0) return { min: config.timeLimitSeconds, max: config.timeLimitSeconds };
  return { min: Math.min(...times), max: Math.max(...times) };
};

export const isQuestionTextValid = (text: QuizText) => {
  const plain = quizPlainText(text);
  return plain.length <= POP_QUIZ_QUESTION_MAX_LENGTH && !hasHiddenCharacters(plain);
};

const isFilled = (value: string) => value.trim().length > 0;

export const isQuestionComplete = (question: QuizQuestion) =>
  isFilled(quizPlainText(question.text)) &&
  QUIZ_ANSWER_KEYS.every((key) => isFilled(question.answers[key])) &&
  question.correct !== null;
