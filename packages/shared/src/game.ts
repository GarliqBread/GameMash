export type { GameInputPayload, GameNextPayload } from "./schemas.js";

export type GameStanding = {
  playerId: string;
  points: number;
};

export type PlayingSnapshot = {
  status: "playing";
  phaseId: number;
  gameIndex: number;
  gameCount: number;
  gameType: string;
  phase: string;
  phaseEndsAt: number | null;
  waitsForHost: boolean;
  serverNow: number;
  view: unknown;
};

export type FinishedSnapshot = {
  status: "finished";
  phaseId: number;
  serverNow: number;
  standings: GameStanding[];
};

export type GameSnapshot = PlayingSnapshot | FinishedSnapshot;
