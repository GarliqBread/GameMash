import { MS_PER_SECOND } from "@gamemash/shared";
import { rankOf } from "../ranking.js";
import type { Points } from "../rules.js";
import type { QuizLeaderboard } from "./views.js";

export const POP_QUIZ_READ_MS = 5000;
export const POP_QUIZ_AUTO_NEXT_SECONDS = 10;
export const POP_QUIZ_AUTO_NEXT_MS = POP_QUIZ_AUTO_NEXT_SECONDS * MS_PER_SECOND;
const POP_QUIZ_LEADERBOARD_SIZE = 5;
const MAX_SPEED_PENALTY = 0.5;

type QuizPointsInput = {
  points: number;
  speedBonus: boolean;
  limitMs: number;
  elapsedMs: number;
};

export const quizPoints = ({ points, speedBonus, limitMs, elapsedMs }: QuizPointsInput) => {
  if (!speedBonus) return points;
  const ratio = Math.min(Math.max(elapsedMs / limitMs, 0), 1);
  return Math.round(points * (1 - ratio * MAX_SPEED_PENALTY));
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
