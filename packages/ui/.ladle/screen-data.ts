import type { LeaderboardEntry } from "../src/game/Leaderboard";
import type { RankedPlayer } from "../src/game/Podium";
import type { AnswerOption, AnswerShapeName } from "../src/lib/answers";
import type { Drawing } from "../src/lib/drawing";
import { HOUSE, LIGHTHOUSE, SUN } from "./sample-drawings";
import { PLAYER_NAMES } from "./story-kit";

export const ROOM_CODE = "KWPX";
export const JOIN_URL = "gamemash.app";

export const SHAPE_LABELS: Record<AnswerShapeName, string> = {
  squircle: "Squircle",
  triangle: "Triangle",
  plus: "Plus",
  dome: "Dome",
};

export const QUIZ_OPTIONS: AnswerOption[] = [
  { shape: "squircle", label: "Jupiter", shapeLabel: SHAPE_LABELS.squircle },
  { shape: "triangle", label: "Saturn", shapeLabel: SHAPE_LABELS.triangle },
  { shape: "plus", label: "Uranus", shapeLabel: SHAPE_LABELS.plus },
  { shape: "dome", label: "Neptune", shapeLabel: SHAPE_LABELS.dome },
];

export const QUIZ_COUNTS: Record<AnswerShapeName, number> = { squircle: 3, triangle: 5, plus: 0, dome: 1 };

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

const SAMPLE_IMAGE_COLOURS = [
  "#f26b3a",
  "#9b86ee",
  "#c4de4a",
  "#5cc8ee",
  "#ffd23f",
  "#1a1726",
  "#f7a6c4",
  "#3aa17e",
  "#8b5a2b",
];

const sampleImageUrl = (colour: string, index: number) => {
  const [width, height] = index % 3 === 1 ? [600, 900] : index % 3 === 2 ? [900, 900] : [1600, 900];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${colour}"/><circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 4}" fill="#fffdf6" opacity="0.7"/><text x="50%" y="54%" font-family="sans-serif" font-size="${Math.min(width, height) / 5}" font-weight="800" text-anchor="middle" fill="#1a1726">${index + 1}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

export const SAMPLE_QUESTION_IMAGES = SAMPLE_IMAGE_COLOURS.map((colour, index) => ({
  id: `image-${index + 1}`,
  url: sampleImageUrl(colour, index),
  alt: `Image ${index + 1}`,
}));
