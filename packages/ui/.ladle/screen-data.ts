import type { LeaderboardEntry } from "../src/game/Leaderboard";
import type { RankedPlayer } from "../src/game/Podium";
import type { AnswerOption, AnswerShapeName } from "../src/lib/answers";
import type { Drawing } from "../src/lib/drawing";
import { HOUSE, LIGHTHOUSE, SUN } from "./sample-drawings";
import { PLAYER_NAMES } from "./story-kit";

export const ROOM_CODE = "KWPX";
export const JOIN_URL = "gamemash.app";

export const QUIZ_OPTIONS: AnswerOption[] = [
  { shape: "triangle", label: "Jupiter" },
  { shape: "diamond", label: "Saturn" },
  { shape: "circle", label: "Uranus" },
  { shape: "square", label: "Neptune" },
];

export const QUIZ_COUNTS: Record<AnswerShapeName, number> = { triangle: 3, diamond: 5, circle: 0, square: 1 };

export const LEADERBOARD: LeaderboardEntry[] = [
  { id: "priya", rank: 1, name: "Priya", total: 3480, gain: 920, movement: { direction: "up", amount: 2 } },
  { id: "daan", rank: 2, name: "Daan", total: 3210, gain: 780, movement: { direction: "down", amount: 1 } },
  { id: "sophie", rank: 3, name: "Sophie", total: 3050, movement: { direction: "down", amount: 1 } },
  { id: "bram", rank: 4, name: "Bram", total: 2890, gain: 860, movement: { direction: "up", amount: 1 } },
  { id: "anouk", rank: 5, name: "Anouk", total: 2640, movement: { direction: "down", amount: 1 } },
  { id: "lars", rank: 6, name: "Lars", total: 2100 },
  { id: "fatima", rank: 7, name: "Fatima", total: 1900 },
  { id: "jeroen", rank: 8, name: "Jeroen", total: 1200 },
  { id: "mei", rank: 9, name: "Mei", total: 800 },
];

export const FINAL_SCORES: RankedPlayer[] = [
  ["Priya", 7940],
  ["Daan", 7510],
  ["Bram", 7120],
  ["Sophie", 6880],
  ["Anouk", 6300],
  ["Lars", 5960],
  ["Fatima", 5410],
  ["Jeroen", 4870],
  ["Mei", 4200],
].map(([name, score], index) => ({ id: String(name), rank: index + 1, name: String(name), score: Number(score) }));

export const FINISHED_DRAWING = new Set(["Anouk", "Bram", "Daan", "Priya", "Fatima", "Mei"]);

const DRAWINGS: Drawing[] = [LIGHTHOUSE, HOUSE, SUN];

export const DRAW_RESULTS = ["Mei", "Lars", "Priya", "Daan", "Sophie", "Bram", "Fatima", "Anouk", "Jeroen"].map(
  (name, index) => ({
    name,
    rank: index + 1,
    average: [8.4, 7.9, 7.6, 6.8, 6.5, 5.9, 5.2, 4.7, 3.1][index] ?? 0,
    drawing: DRAWINGS[index % DRAWINGS.length] ?? LIGHTHOUSE,
  }),
);

export { PLAYER_NAMES };
