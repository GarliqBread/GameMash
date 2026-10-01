import type { DrawItProgress } from "@gamemash/games/config";

export const roundValues = (progress: DrawItProgress) => ({
  current: progress.roundIndex + 1,
  total: progress.roundCount,
  word: progress.word,
});
