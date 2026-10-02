import {
  type AiPart,
  type AiReplyError,
  type AiReplyResult,
  cleanText,
  collect,
  failed,
  isRecord,
} from "../ai-reply.js";
import {
  answerKeysOf,
  defaultPopQuizConfig,
  emptyQuestion,
  POP_QUIZ_ANSWER_MAX_LENGTH,
  POP_QUIZ_IMAGE_HINT_MAX_LENGTH,
  POP_QUIZ_MAX_QUESTIONS,
  POP_QUIZ_QUESTION_MAX_LENGTH,
} from "./config.js";
import type { PopQuizConfig, QuizQuestion } from "./schema.js";

const readImageHint = (value: unknown, item: number, withImageIdeas: boolean, errors: AiReplyError[]) => {
  if (!withImageIdeas || typeof value !== "string") return undefined;
  const hint = cleanText(value);
  if (hint.length > POP_QUIZ_IMAGE_HINT_MAX_LENGTH) {
    errors.push({ code: "image_idea_too_long", item, max: POP_QUIZ_IMAGE_HINT_MAX_LENGTH });
    return undefined;
  }
  return hint.length > 0 ? hint : undefined;
};

const readAnswers = (answers: string[], item: number, errors: AiReplyError[]) => {
  if (answers.length !== 2 && answers.length !== 4) errors.push({ code: "answer_count", item });
  if (answers.some((answer) => answer.length === 0)) errors.push({ code: "answer_empty", item });
  if (answers.some((answer) => answer.length > POP_QUIZ_ANSWER_MAX_LENGTH)) {
    errors.push({ code: "answer_too_long", item, max: POP_QUIZ_ANSWER_MAX_LENGTH });
  }
};

const readQuestion = (
  value: unknown,
  item: number,
  id: string,
  withImageIdeas: boolean,
): AiReplyResult<QuizQuestion> => {
  if (
    !isRecord(value) ||
    typeof value.question !== "string" ||
    !Array.isArray(value.answers) ||
    !value.answers.every((answer) => typeof answer === "string") ||
    typeof value.correct !== "number"
  ) {
    return failed([{ code: "item_wrong_format", item }]);
  }
  const errors: AiReplyError[] = [];
  const text = cleanText(value.question);
  if (text.length === 0) errors.push({ code: "question_empty", item });
  if (text.length > POP_QUIZ_QUESTION_MAX_LENGTH) {
    errors.push({ code: "question_too_long", item, max: POP_QUIZ_QUESTION_MAX_LENGTH });
  }
  const answers = value.answers.map(cleanText);
  readAnswers(answers, item, errors);
  const { correct } = value;
  if (!Number.isInteger(correct) || correct < 0 || correct >= answers.length) {
    errors.push({ code: "correct_invalid", item });
  }
  const imageHint = readImageHint(value.imageIdea, item, withImageIdeas, errors);
  if (errors.length > 0) return failed(errors);

  const question: QuizQuestion = { ...emptyQuestion(id), kind: answers.length === 2 ? "trueFalse" : "choice" };
  const keys = answerKeysOf(question);
  return {
    ok: true,
    value: {
      ...question,
      text: [{ text }],
      answers: { ...question.answers, ...Object.fromEntries(keys.map((key, index) => [key, answers[index] ?? ""])) },
      correct: keys[correct] ?? null,
      ...(imageHint === undefined ? {} : { imageHint }),
    },
  };
};

export const popQuizAi: AiPart<PopQuizConfig> = {
  list: "questions",
  defaultCount: 10,
  maxCount: POP_QUIZ_MAX_QUESTIONS,
  task: (count) =>
    `Quiz: write ${count} questions. Everyone answers on their phone while the question shows on the big screen.`,
  rules: ({ withImageIdeas }) => [
    `- Each question is plain text (no Markdown) and at most ${POP_QUIZ_QUESTION_MAX_LENGTH} characters.`,
    "- Most questions have exactly 4 answers. Some may be true or false questions with exactly 2 answers: true first, then false, translated into the language above.",
    `- Each answer is at most ${POP_QUIZ_ANSWER_MAX_LENGTH} characters.`,
    '- Exactly one answer is correct. "correct" is its position in "answers", counting from 0.',
    "- Facts must be accurate and wrong answers plausible. Vary the position of the correct answer. No repeated questions.",
    withImageIdeas &&
      `- "imageIdea" is an optional image search phrase of at most ${POP_QUIZ_IMAGE_HINT_MAX_LENGTH} characters for a picture that fits the question without giving the answer away. Never a URL.`,
  ],
  example: ({ withImageIdeas }) =>
    withImageIdeas
      ? '[{"question": "...", "answers": ["...", "...", "...", "..."], "correct": 0, "imageIdea": "..."}]'
      : '[{"question": "...", "answers": ["...", "...", "...", "..."], "correct": 0}]',
  parse: (items, newId, withImageIdeas) => {
    const questions = collect(items.map((value, index) => readQuestion(value, index + 1, newId(), withImageIdeas)));
    return questions.ok ? { ok: true, value: { ...defaultPopQuizConfig(""), questions: questions.value } } : questions;
  },
};
