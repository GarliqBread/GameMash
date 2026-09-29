import type { Points } from "./rules.js";

export const rankOf = (totals: Points, playerId: string) => {
  const mine = totals[playerId] ?? 0;
  return 1 + Object.values(totals).filter((total) => total > mine).length;
};
