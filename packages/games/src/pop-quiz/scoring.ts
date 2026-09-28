import type { Points } from "../rules.js";
import type { QuizLeaderboard } from "./views.js";

export const POP_QUIZ_READ_MS = 5000;
export const POP_QUIZ_LEADERBOARD_SIZE = 5;

export type QuizPointsInput = {
  points: number;
  speedBonus: boolean;
  limitMs: number;
  elapsedMs: number;
};

export const quizPoints = ({ points, speedBonus, limitMs, elapsedMs }: QuizPointsInput) => {
  if (!speedBonus) return points;
  const ratio = Math.min(Math.max(elapsedMs / limitMs, 0), 1);
  return Math.round(points * (1 - ratio / 2));
};

export const rankOf = (totals: Points, playerId: string) => {
  const mine = totals[playerId] ?? 0;
  return 1 + Object.values(totals).filter((total) => total > mine).length;
};

export const buildLeaderboard = (totals: Points, gains: Points, size = POP_QUIZ_LEADERBOARD_SIZE): QuizLeaderboard => {
  const playerIds = [...new Set([...Object.keys(totals), ...Object.keys(gains)])];
  const current = Object.fromEntries(playerIds.map((playerId) => [playerId, totals[playerId] ?? 0]));
  const previous = Object.fromEntries(
    playerIds.map((playerId) => [playerId, (current[playerId] ?? 0) - (gains[playerId] ?? 0)]),
  );
  const hasPrevious = Object.values(previous).some((total) => total !== 0);
  const entries = playerIds
    .map((playerId) => ({
      playerId,
      rank: rankOf(current, playerId),
      previousRank: hasPrevious ? rankOf(previous, playerId) : null,
      total: current[playerId] ?? 0,
      gain: gains[playerId] ?? 0,
    }))
    .toSorted((a, b) => a.rank - b.rank || a.playerId.localeCompare(b.playerId));
  return { entries: entries.slice(0, size), rankedCount: entries.length };
};
