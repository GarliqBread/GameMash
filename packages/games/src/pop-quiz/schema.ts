import { type Static, Type } from "typebox";
import {
  POP_QUIZ_ANSWER_MAX_LENGTH,
  POP_QUIZ_MAX_QUESTIONS,
  POP_QUIZ_POINTS,
  POP_QUIZ_QUESTION_MAX_LENGTH,
  POP_QUIZ_TIME_LIMITS,
  QUIZ_ANSWER_KEYS,
} from "./config.js";

export const ItemIdSchema = Type.String({ minLength: 1, maxLength: 64, pattern: "^[A-Za-z0-9_-]+$" });

const AnswerTextSchema = Type.String({ maxLength: POP_QUIZ_ANSWER_MAX_LENGTH });

export const QuizQuestionSchema = Type.Object(
  {
    id: ItemIdSchema,
    text: Type.String({ maxLength: POP_QUIZ_QUESTION_MAX_LENGTH }),
    answers: Type.Object(
      {
        triangle: AnswerTextSchema,
        diamond: AnswerTextSchema,
        circle: AnswerTextSchema,
        square: AnswerTextSchema,
      },
      { additionalProperties: false },
    ),
    correct: Type.Union([Type.Enum(QUIZ_ANSWER_KEYS), Type.Null()]),
  },
  { additionalProperties: false },
);
export type QuizQuestion = Static<typeof QuizQuestionSchema>;

export const PopQuizConfigSchema = Type.Object(
  {
    questions: Type.Array(QuizQuestionSchema, { maxItems: POP_QUIZ_MAX_QUESTIONS }),
    timeLimitSeconds: Type.Enum(POP_QUIZ_TIME_LIMITS),
    points: Type.Enum(POP_QUIZ_POINTS),
    speedBonus: Type.Boolean(),
    leaderboardAfterEachQuestion: Type.Boolean(),
    shuffleAnswers: Type.Boolean(),
  },
  { additionalProperties: false },
);
export type PopQuizConfig = Static<typeof PopQuizConfigSchema>;
