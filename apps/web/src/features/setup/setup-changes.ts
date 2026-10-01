import {
  type DrawItConfig,
  emptyQuestion,
  emptyWord,
  type GameSetup,
  type GameType,
  type PopQuizConfig,
  type QuizQuestion,
  type QuizQuestionKind,
  type SessionSetup,
} from "@gamemash/games/config";
import { createLocalId } from "../../lib/ids";

export const newQuestionId = () => createLocalId("q");

export const newWordId = () => createLocalId("w");

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

const updateGame = (setup: SessionSetup, gameId: string, change: (game: GameSetup) => GameSetup): SessionSetup => ({
  ...setup,
  games: setup.games.map((game) => (game.id === gameId ? change(game) : game)),
});

export type ConfigOf<Type extends GameType> = Extract<GameSetup, { type: Type }>["config"];

export type GameOf<Type extends GameType> = {
  [Key in Type]: { id: string; type: Key; config: ConfigOf<Key> };
}[Type];

export const updateQuizConfig = (
  setup: SessionSetup,
  gameId: string,
  change: (config: PopQuizConfig) => PopQuizConfig,
): SessionSetup =>
  updateGame(setup, gameId, (game) => (game.type === "pop-quiz" ? { ...game, config: change(game.config) } : game));

export const updateDrawItConfig = (
  setup: SessionSetup,
  gameId: string,
  change: (config: DrawItConfig) => DrawItConfig,
): SessionSetup =>
  updateGame(setup, gameId, (game) => (game.type === "draw-it" ? { ...game, config: change(game.config) } : game));

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

type TrueFalseLabels = { true: string; false: string };

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

export const changeWord = (config: DrawItConfig, wordId: string, text: string): DrawItConfig => ({
  ...config,
  words: config.words.map((word) => (word.id === wordId ? { ...word, text } : word)),
});

export const addWord = (config: DrawItConfig, id: string): DrawItConfig => ({
  ...config,
  words: [...config.words, emptyWord(id)],
});

export const deleteWord = (config: DrawItConfig, wordId: string): DrawItConfig => ({
  ...config,
  words: config.words.filter((word) => word.id !== wordId),
});
