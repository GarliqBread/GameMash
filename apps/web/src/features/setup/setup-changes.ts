import {
  defaultPopQuizConfig,
  emptyQuestion,
  type GameSetup,
  type PopQuizConfig,
  type QuizQuestion,
  type QuizQuestionKind,
  type SessionSetup,
} from "@gamemash/games/config";
import { createLocalId } from "../../lib/ids";

export const newQuestionId = () => createLocalId("q");

export const newQuiz = (): GameSetup => ({
  id: createLocalId("quiz"),
  type: "pop-quiz",
  config: defaultPopQuizConfig(newQuestionId()),
});

export const addGame = (setup: SessionSetup, game: GameSetup): SessionSetup => ({
  ...setup,
  games: [...setup.games, game],
});

export const removeGame = (setup: SessionSetup, gameId: string): SessionSetup => ({
  ...setup,
  games: setup.games.filter((game) => game.id !== gameId),
});

export const reorderGames = (setup: SessionSetup, orderedIds: string[]): SessionSetup => ({
  ...setup,
  games: orderedIds.flatMap((id) => setup.games.filter((game) => game.id === id)),
});

export const updateConfig = (
  setup: SessionSetup,
  gameId: string,
  change: (config: PopQuizConfig) => PopQuizConfig,
): SessionSetup => ({
  ...setup,
  games: setup.games.map((game) => (game.id === gameId ? { ...game, config: change(game.config) } : game)),
});

export const updateQuestion = (
  config: PopQuizConfig,
  questionId: string,
  change: (question: QuizQuestion) => QuizQuestion,
): PopQuizConfig => ({
  ...config,
  questions: config.questions.map((question) => (question.id === questionId ? change(question) : question)),
});

export const insertQuestionAfter = (config: PopQuizConfig, afterId: string | null, question: QuizQuestion) => {
  const index = afterId ? config.questions.findIndex((item) => item.id === afterId) : config.questions.length - 1;
  return {
    ...config,
    questions: [...config.questions.slice(0, index + 1), question, ...config.questions.slice(index + 1)],
  };
};

export const addQuestion = (config: PopQuizConfig, id: string) => insertQuestionAfter(config, null, emptyQuestion(id));

export const deleteQuestion = (config: PopQuizConfig, questionId: string): PopQuizConfig => ({
  ...config,
  questions: config.questions.filter((question) => question.id !== questionId),
});

export type TrueFalseLabels = { true: string; false: string };

export const changeQuestionKind = (
  question: QuizQuestion,
  kind: QuizQuestionKind,
  labels: TrueFalseLabels,
): QuizQuestion => {
  if (kind === question.kind) return question;
  const keepUnlessDefault = (value: string, label: string) => (value === label ? "" : value);
  const answers =
    kind === "trueFalse"
      ? { squircle: labels.false, triangle: "", plus: labels.true, dome: "" }
      : {
          squircle: keepUnlessDefault(question.answers.squircle, labels.false),
          triangle: "",
          plus: keepUnlessDefault(question.answers.plus, labels.true),
          dome: "",
        };
  return { ...question, kind, answers, correct: null };
};
