import type { PopQuizConfig, QuizQuestion } from "./schema.js";

export type { PopQuizConfig, QuizQuestion } from "./schema.js";

export const POP_QUIZ_QUESTION_MAX_LENGTH = 90;
export const POP_QUIZ_ANSWER_MAX_LENGTH = 40;
export const POP_QUIZ_MAX_QUESTIONS = 50;
export const POP_QUIZ_TIME_LIMITS = [10, 20, 30, 60];
export const POP_QUIZ_POINTS = [500, 1000, 2000];

export type QuizAnswerKey = "squircle" | "triangle" | "plus" | "dome";
export const QUIZ_ANSWER_KEYS: QuizAnswerKey[] = ["squircle", "triangle", "plus", "dome"];

export const emptyQuestion = (id: string): QuizQuestion => ({
  id,
  text: "",
  answers: { squircle: "", triangle: "", plus: "", dome: "" },
  correct: null,
});

export const defaultPopQuizConfig = (firstQuestionId: string): PopQuizConfig => ({
  questions: [emptyQuestion(firstQuestionId)],
  timeLimitSeconds: 20,
  points: 1000,
  speedBonus: true,
  leaderboardAfterEachQuestion: true,
  shuffleAnswers: false,
});

const isFilled = (value: string) => value.trim().length > 0;

export const isQuestionComplete = (question: QuizQuestion) =>
  isFilled(question.text) &&
  QUIZ_ANSWER_KEYS.every((key) => isFilled(question.answers[key])) &&
  question.correct !== null;
