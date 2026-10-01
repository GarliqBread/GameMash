import { isBlankDrawing, MS_PER_SECOND, pointCount } from "@gamemash/shared";
import { Value } from "typebox/value";
import { shuffled } from "../random.js";
import { rankOf } from "../ranking.js";
import type { GameRules, Phase, Points, Submission, UploadViewer } from "../rules.js";
import { DRAW_IT_MAX_POINTS, type DrawItConfig, type DrawItWord, OWN_DRAWING_ID } from "./config.js";
import { DrawingUploadSchema } from "./schema.js";
import {
  assignRatings,
  averageOf,
  DRAW_IT_RATE_MS_PER_DRAWING,
  DRAW_IT_RESULTS_MS,
  type DrawItDrawing,
  drawingPoints,
  isRating,
  ratingsPerPlayer,
} from "./scoring.js";
import type { DrawItPlayerView, DrawItResultEntry, DrawItStageView } from "./views.js";

export type DrawItState = {
  roundIndex: number;
  drawings: DrawItDrawing[];
  assignments: Record<string, string[]>;
  results: DrawItResultEntry[];
};

type DrawInput = { done: boolean; blank: boolean };
type RateInput = Record<string, number>;
export type DrawItInput = DrawInput | RateInput;

const MIN_DRAWINGS_TO_RATE = 2;

const drawPhase = (config: DrawItConfig, playerIds: string[]): Phase => ({
  name: "draw",
  durationMs: config.drawSeconds * MS_PER_SECOND,
  input: { from: playerIds, endsWhenAllSubmitted: true, replaceable: true, via: "upload" },
});

const ratePhase = (assignments: Record<string, string[]>, perPlayer: number): Phase => ({
  name: "rate",
  durationMs: perPlayer * DRAW_IT_RATE_MS_PER_DRAWING,
  input: { from: Object.keys(assignments), endsWhenAllSubmitted: true, replaceable: true },
});

const resultsPhase: Phase = { name: "results", durationMs: DRAW_IT_RESULTS_MS, input: null, skippable: true };

const wordAt = (config: DrawItConfig, index: number): DrawItWord => {
  const word = config.words[index];
  if (!word) throw new Error(`draw it has no word ${index}`);
  return word;
};

const startRound = (roundIndex: number): DrawItState => ({ roundIndex, drawings: [], assignments: {}, results: [] });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseDraw = (input: unknown): DrawInput | null =>
  isRecord(input) &&
  Object.keys(input).length === 2 &&
  typeof input.done === "boolean" &&
  typeof input.blank === "boolean"
    ? { done: input.done, blank: input.blank }
    : null;

const parseRate = (input: unknown, allowed: string[]): RateInput | null => {
  if (!isRecord(input)) return null;
  const entries = Object.entries(input);
  const isValid = entries.every(([drawingId, rating]) => allowed.includes(drawingId) && isRating(rating));
  return isValid ? Object.fromEntries(entries.filter((entry): entry is [string, number] => isRating(entry[1]))) : null;
};

const parseUpload = (body: unknown) => {
  if (!Value.Check(DrawingUploadSchema, body) || pointCount(body.drawing) > DRAW_IT_MAX_POINTS) return null;
  return { input: { done: body.done, blank: isBlankDrawing(body.drawing) }, payload: body.drawing };
};

const drawingOwnerIn = (state: DrawItState, drawingId: string) =>
  state.drawings.find((drawing) => drawing.id === drawingId)?.playerId ?? null;

const isAssigned = (state: DrawItState, viewer: UploadViewer, drawingId: string) =>
  viewer.kind === "host" || (state.assignments[viewer.playerId] ?? []).includes(drawingId);

const uploadOwner = (state: DrawItState, phase: Phase, viewer: UploadViewer, id: string) => {
  if (phase.name === "draw") return viewer.kind === "player" && id === OWN_DRAWING_ID ? viewer.playerId : null;
  if (phase.name === "rate") return isAssigned(state, viewer, id) ? drawingOwnerIn(state, id) : null;
  return drawingOwnerIn(state, id);
};

const isDrawInput = (input: DrawItInput): input is DrawInput => typeof input.done === "boolean";

const drawInputs = (submissions: Map<string, Submission<DrawItInput>>) =>
  [...submissions].flatMap(([playerId, { input }]) => (isDrawInput(input) ? [[playerId, input] as const] : []));

const rateInputs = (submissions: Map<string, Submission<DrawItInput>>) =>
  [...submissions].flatMap(([, { input }]) => (isDrawInput(input) ? [] : [input]));

const drawingsFrom = (submissions: Map<string, Submission<DrawItInput>>, random: () => number): DrawItDrawing[] =>
  shuffled(
    drawInputs(submissions)
      .filter(([, input]) => !input.blank)
      .map(([playerId]) => playerId),
    random,
  ).map((playerId, index) => ({ id: `d${index + 1}`, playerId }));

const scoreDrawings = (drawings: DrawItDrawing[], ratings: RateInput[]): DrawItResultEntry[] => {
  const scored = drawings.map((drawing) => {
    const received = ratings.flatMap((input) => {
      const rating = input[drawing.id];
      return rating === undefined ? [] : [rating];
    });
    const average = averageOf(received);
    return { drawing, average, ratingCount: received.length, points: drawingPoints(average) };
  });
  const byPlayer: Points = Object.fromEntries(scored.map((entry) => [entry.drawing.playerId, entry.points]));
  return scored
    .map(({ drawing, average, ratingCount, points }) => ({
      drawingId: drawing.id,
      playerId: drawing.playerId,
      rank: rankOf(byPlayer, drawing.playerId),
      average,
      ratingCount,
      points,
    }))
    .toSorted((a, b) => a.rank - b.rank || b.ratingCount - a.ratingCount || a.drawingId.localeCompare(b.drawingId));
};

const pointsOf = (results: DrawItResultEntry[]): Points =>
  Object.fromEntries(results.map((entry) => [entry.playerId, entry.points]));

const progressOf = (config: DrawItConfig, state: DrawItState) => ({
  roundIndex: state.roundIndex,
  roundCount: config.words.length,
  word: wordAt(config, state.roundIndex).text,
});

const isFullyRated = (state: DrawItState, playerId: string, input: RateInput) =>
  (state.assignments[playerId] ?? []).every((drawingId) => input[drawingId] !== undefined);

const isInputDone = (state: DrawItState, playerId: string, input: DrawItInput) =>
  isDrawInput(input) ? input.done : isFullyRated(state, playerId, input);

const doneIdsOf = (state: DrawItState, submissions: Map<string, Submission<DrawItInput>>) =>
  [...submissions].filter(([playerId, { input }]) => isInputDone(state, playerId, input)).map(([playerId]) => playerId);

export const drawItRules: GameRules<DrawItConfig, DrawItState, DrawItInput> = {
  type: "draw-it",

  parseInput: ({ state, phase, playerId, input }) => {
    if (phase.name === "draw") return parseDraw(input);
    if (phase.name === "rate") return parseRate(input, state.assignments[playerId] ?? []);
    return null;
  },

  isInputDone: ({ state, playerId, input }) => isInputDone(state, playerId, input),

  parseUpload: ({ phase, input }) => (phase.name === "draw" ? parseUpload(input) : null),

  uploadOwner: ({ state, phase, viewer, id }) => uploadOwner(state, phase, viewer, id),

  begin: ({ config, playerIds }) => ({ phase: drawPhase(config, playerIds), state: startRound(0) }),

  advance: ({ config, state, phase, submissions, playerIds, random }) => {
    if (phase.name === "draw") {
      const drawings = drawingsFrom(submissions, random);
      if (drawings.length < MIN_DRAWINGS_TO_RATE) {
        const results = scoreDrawings(drawings, []);
        return { phase: resultsPhase, state: { ...state, drawings, results }, points: pointsOf(results) };
      }
      const assignments = assignRatings(drawings, playerIds);
      return {
        phase: ratePhase(assignments, ratingsPerPlayer(drawings.length)),
        state: { ...state, drawings, assignments },
      };
    }
    if (phase.name === "rate") {
      const results = scoreDrawings(state.drawings, rateInputs(submissions));
      return { phase: resultsPhase, state: { ...state, results }, points: pointsOf(results) };
    }
    const nextIndex = state.roundIndex + 1;
    if (nextIndex >= config.words.length) return { phase: null };
    return { phase: drawPhase(config, playerIds), state: startRound(nextIndex) };
  },

  stageView: ({ config, state, phase, submissions }): DrawItStageView => {
    const progress = progressOf(config, state);
    if (phase.name === "draw") {
      return {
        ...progress,
        kind: "draw",
        participantIds: phase.input?.from ?? [],
        doneIds: doneIdsOf(state, submissions),
        drawSeconds: config.drawSeconds,
      };
    }
    if (phase.name === "rate") {
      return {
        ...progress,
        kind: "rate",
        drawingIds: state.drawings.map((drawing) => drawing.id),
        finishedCount: doneIdsOf(state, submissions).length,
        participantCount: phase.input?.from.length ?? 0,
        rateSeconds: (phase.durationMs ?? 0) / MS_PER_SECOND,
      };
    }
    return {
      ...progress,
      kind: "results",
      entries: state.results,
      ratingCount: state.results.reduce((sum, entry) => sum + entry.ratingCount, 0),
    };
  },

  playerView: ({ config, state, phase, submissions, totals, playerId, isParticipant }): DrawItPlayerView => {
    const progress = progressOf(config, state);
    const total = totals[playerId] ?? 0;
    const mine = submissions.get(playerId)?.input;
    if (phase.name === "draw") {
      return {
        ...progress,
        kind: "draw",
        isParticipant,
        isDone: mine !== undefined && isDrawInput(mine) && mine.done,
        drawSeconds: config.drawSeconds,
        total,
      };
    }
    if (phase.name === "rate") {
      return {
        ...progress,
        kind: "rate",
        isParticipant,
        toRate: state.assignments[playerId] ?? [],
        mine: mine !== undefined && !isDrawInput(mine) ? mine : {},
        total,
      };
    }
    const entry = state.results.find((result) => result.playerId === playerId);
    return {
      ...progress,
      kind: "results",
      result: entry ? { rank: entry.rank, average: entry.average, points: entry.points } : null,
      total,
      rank: rankOf(totals, playerId),
    };
  },
};
