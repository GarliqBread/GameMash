import { MS_PER_SECOND } from "@gamemash/shared";
import { shuffled } from "../random.js";
import { rankOf } from "../ranking.js";
import type { GameRules, Phase, Points, Submission } from "../rules.js";
import {
  answerKeysOf,
  POP_QUIZ_POINTS,
  type PopQuizConfig,
  type QuizAnswerKey,
  type QuizQuestion,
  questionTimeLimit,
} from "./config.js";
import { buildLeaderboard, POP_QUIZ_AUTO_NEXT_MS, POP_QUIZ_READ_MS, quizPoints } from "./scoring.js";
import type { QuizAnswerOption, QuizFastest, QuizPlayerView, QuizStageView } from "./views.js";

type QuizResult = {
  shape: QuizAnswerKey;
  isCorrect: boolean;
  points: number;
  ms: number;
};

export type QuizState = {
  questionIndex: number;
  layout: QuizAnswerKey[];
  participantCount: number;
  results: Record<string, QuizResult>;
};

const questionPhase: Phase = { name: "question", durationMs: POP_QUIZ_READ_MS, input: null };

const isAutoNext = (config: PopQuizConfig) => config.autoNextQuestion !== false;

const playsVideoToTheEnd = (question: QuizQuestion) => question.proof?.kind === "video" && !question.proof.loop;

const revealPhase = (config: PopQuizConfig, question: QuizQuestion): Phase =>
  isAutoNext(config) && !playsVideoToTheEnd(question)
    ? { name: "reveal", durationMs: POP_QUIZ_AUTO_NEXT_MS, input: null, skippable: true }
    : { name: "reveal", durationMs: null, input: null };

const answeringPhase = (config: PopQuizConfig, question: QuizQuestion, playerIds: string[]): Phase => ({
  name: "answering",
  durationMs: questionTimeLimit(config, question) * MS_PER_SECOND,
  input: { from: playerIds, endsWhenAllSubmitted: true },
});

const isShownShape = (question: QuizQuestion, value: unknown): value is QuizAnswerKey =>
  answerKeysOf(question).some((shape) => shape === value);

const questionAt = (config: PopQuizConfig, index: number): QuizQuestion => {
  const question = config.questions[index];
  if (!question) throw new Error(`pop quiz has no question ${index}`);
  return question;
};

const layoutOf = (config: PopQuizConfig, question: QuizQuestion, random: () => number) => {
  const keys = answerKeysOf(question);
  return config.shuffleAnswers && question.kind === "choice" ? shuffled(keys, random) : [...keys];
};

const startQuestion = (config: PopQuizConfig, questionIndex: number, random: () => number): QuizState => ({
  questionIndex,
  layout: layoutOf(config, questionAt(config, questionIndex), random),
  participantCount: 0,
  results: {},
});

const originalKey = (question: QuizQuestion, state: QuizState, shape: QuizAnswerKey) =>
  state.layout[answerKeysOf(question).indexOf(shape)] ?? shape;

const answersOf = (question: QuizQuestion, state: QuizState): QuizAnswerOption[] =>
  answerKeysOf(question).map((shape) => ({ shape, text: question.answers[originalKey(question, state, shape)] }));

const correctShape = (question: QuizQuestion, state: QuizState): QuizAnswerKey => {
  const shape = answerKeysOf(question).find((key) => originalKey(question, state, key) === question.correct);
  if (!shape) throw new Error(`pop quiz question ${question.id} has no correct answer`);
  return shape;
};

const scoreAnswers = (
  config: PopQuizConfig,
  state: QuizState,
  submissions: Map<string, Submission<QuizAnswerKey>>,
  phaseStartedAt: number,
) => {
  const question = questionAt(config, state.questionIndex);
  const limitMs = questionTimeLimit(config, question) * MS_PER_SECOND;
  const points = POP_QUIZ_POINTS[question.points];
  const entries = [...submissions].map(([playerId, { input, at }]): [string, QuizResult] => {
    const ms = Math.min(Math.max(at - phaseStartedAt, 0), limitMs);
    const isCorrect = originalKey(question, state, input) === question.correct;
    const earned = isCorrect ? quizPoints({ points, speedBonus: config.speedBonus, limitMs, elapsedMs: ms }) : 0;
    return [playerId, { shape: input, isCorrect, points: earned, ms }];
  });
  return Object.fromEntries(entries);
};

const pointsOf = (results: Record<string, QuizResult>): Points =>
  Object.fromEntries(Object.entries(results).map(([playerId, result]) => [playerId, result.points]));

const fastestOf = (results: Record<string, QuizResult>): QuizFastest | null =>
  Object.entries(results)
    .filter(([, result]) => result.isCorrect)
    .map(([playerId, result]) => ({ playerId, ms: result.ms }))
    .reduce<QuizFastest | null>((best, entry) => (best === null || entry.ms < best.ms ? entry : best), null);

const countsOf = (results: Record<string, QuizResult>): Record<QuizAnswerKey, number> => {
  const count = (shape: QuizAnswerKey) => Object.values(results).filter((result) => result.shape === shape).length;
  return { squircle: count("squircle"), triangle: count("triangle"), plus: count("plus"), dome: count("dome") };
};

const progressOf = (config: PopQuizConfig, state: QuizState) => ({
  questionIndex: state.questionIndex,
  questionCount: config.questions.length,
});

export const popQuizRules: GameRules<PopQuizConfig, QuizState, QuizAnswerKey> = {
  type: "pop-quiz",

  parseInput: ({ config, state, phase, input }) =>
    phase.name === "answering" && isShownShape(questionAt(config, state.questionIndex), input) ? input : null,

  begin: ({ config, random }) => ({ phase: questionPhase, state: startQuestion(config, 0, random) }),

  advance: ({ config, state, phase, phaseStartedAt, submissions, playerIds, random }) => {
    if (phase.name === "question") {
      return {
        phase: answeringPhase(config, questionAt(config, state.questionIndex), playerIds),
        state: { ...state, participantCount: playerIds.length },
      };
    }
    if (phase.name === "answering") {
      const results = scoreAnswers(config, state, submissions, phaseStartedAt);
      const question = questionAt(config, state.questionIndex);
      return { phase: revealPhase(config, question), state: { ...state, results }, points: pointsOf(results) };
    }
    const nextIndex = state.questionIndex + 1;
    if (nextIndex >= config.questions.length) return { phase: null };
    return { phase: questionPhase, state: startQuestion(config, nextIndex, random) };
  },

  stageView: ({ config, state, phase, submissions, totals }): QuizStageView => {
    const question = questionAt(config, state.questionIndex);
    const progress = progressOf(config, state);
    const proof = question.proof ?? null;
    if (phase.name === "question")
      return { ...progress, kind: "question", text: question.text, images: question.images, proof };
    const answers = answersOf(question, state);
    if (phase.name === "answering") {
      return {
        ...progress,
        kind: "answering",
        text: question.text,
        images: question.images,
        proof,
        answers,
        answeredCount: submissions.size,
        participantCount: state.participantCount,
        timeLimitSeconds: questionTimeLimit(config, question),
      };
    }
    return {
      ...progress,
      kind: "reveal",
      text: question.text,
      nextImages: config.questions[state.questionIndex + 1]?.images ?? [],
      answers,
      correct: correctShape(question, state),
      counts: countsOf(state.results),
      correctCount: Object.values(state.results).filter((result) => result.isCorrect).length,
      participantCount: state.participantCount,
      fastest: fastestOf(state.results),
      leaderboard:
        config.leaderboardAfterEachQuestion && !proof ? buildLeaderboard(totals, pointsOf(state.results)) : null,
      proof,
      autoNext: isAutoNext(config),
    };
  },

  playerView: ({ config, state, phase, submissions, totals, playerId, isParticipant }): QuizPlayerView => {
    const question = questionAt(config, state.questionIndex);
    const progress = progressOf(config, state);
    const total = totals[playerId] ?? 0;
    if (phase.name === "question") return { ...progress, kind: "question", total };
    if (phase.name === "answering") {
      return {
        ...progress,
        kind: "answering",
        answers: answersOf(question, state),
        mine: submissions.get(playerId)?.input ?? null,
        isParticipant,
        timeLimitSeconds: questionTimeLimit(config, question),
        total,
      };
    }
    const result = state.results[playerId];
    const correct = correctShape(question, state);
    const gains = pointsOf(state.results);
    return {
      ...progress,
      kind: "reveal",
      correct: { shape: correct, text: question.answers[originalKey(question, state, correct)] },
      result: result
        ? { shape: result.shape, isCorrect: result.isCorrect, points: result.points, ms: result.ms }
        : null,
      total,
      rank: rankOf(totals, playerId),
      leaderboard: config.leaderboardAfterEachQuestion ? buildLeaderboard(totals, gains) : null,
      isParticipant,
    };
  },
};
