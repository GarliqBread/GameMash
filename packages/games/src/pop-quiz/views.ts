import type { QuizAnswerKey } from "./config.js";
import type { QuizProof, QuizText } from "./schema.js";

export type QuizAnswerOption = {
  shape: QuizAnswerKey;
  text: string;
};

export type QuizProgress = {
  questionIndex: number;
  questionCount: number;
};

export type QuizLeaderboardEntry = {
  playerId: string;
  rank: number;
  previousRank: number | null;
  total: number;
  gain: number;
};

export type QuizLeaderboard = {
  entries: QuizLeaderboardEntry[];
  rankedCount: number;
};

export type QuizFastest = {
  playerId: string;
  ms: number;
};

export type QuizStageView =
  | (QuizProgress & { kind: "question"; text: QuizText; images: string[]; proof: QuizProof | null })
  | (QuizProgress & {
      kind: "answering";
      text: QuizText;
      images: string[];
      proof: QuizProof | null;
      answers: QuizAnswerOption[];
      answeredCount: number;
      participantCount: number;
      timeLimitSeconds: number;
    })
  | (QuizProgress & {
      kind: "reveal";
      text: QuizText;
      nextImages: string[];
      answers: QuizAnswerOption[];
      correct: QuizAnswerKey;
      counts: Record<QuizAnswerKey, number>;
      correctCount: number;
      participantCount: number;
      fastest: QuizFastest | null;
      leaderboard: QuizLeaderboard | null;
      proof: QuizProof | null;
      autoNext: boolean;
    });

export type QuizPlayerResult = {
  shape: QuizAnswerKey;
  isCorrect: boolean;
  points: number;
  ms: number;
};

export type QuizPlayerView =
  | (QuizProgress & { kind: "question"; total: number })
  | (QuizProgress & {
      kind: "answering";
      answers: QuizAnswerOption[];
      mine: QuizAnswerKey | null;
      isParticipant: boolean;
      timeLimitSeconds: number;
      total: number;
    })
  | (QuizProgress & {
      kind: "reveal";
      correct: QuizAnswerOption;
      result: QuizPlayerResult | null;
      total: number;
      rank: number | null;
      leaderboard: QuizLeaderboard | null;
      isParticipant: boolean;
    });
