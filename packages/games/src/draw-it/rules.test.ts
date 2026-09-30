import { describe, expect, it } from "vitest";
import type { Phase, PhaseChange, Submission, UploadViewer } from "../rules.js";
import { type DrawItConfig, defaultDrawItConfig } from "./config.js";
import { type DrawItInput, type DrawItState, drawItRules as rules } from "./rules.js";
import { assignRatings, averageOf, drawingPoints } from "./scoring.js";

const PLAYERS = ["priya", "daan", "lars", "mei"];
const STARTED_AT = 1_000;
const config: DrawItConfig = {
  ...defaultDrawItConfig("w1"),
  words: [
    { id: "w1", text: "Lighthouse" },
    { id: "w2", text: "Coffee machine" },
  ],
};
const inOrder = () => 0.5;

const submitted = (entries: [string, DrawItInput][]) =>
  new Map<string, Submission<DrawItInput>>(entries.map(([playerId, input]) => [playerId, { input, at: STARTED_AT }]));

const expectPhase = (change: PhaseChange<DrawItState>) => {
  if (change.phase === null) throw new Error("expected another phase");
  return { phase: change.phase, state: change.state, points: change.points };
};

const context = (state: DrawItState, phase: Phase, submissions = submitted([]), playerIds = PLAYERS) => ({
  config,
  state,
  phase,
  phaseStartedAt: STARTED_AT,
  submissions,
  playerIds,
  random: inOrder,
});

const begin = () => rules.begin({ config, playerIds: PLAYERS, random: inOrder });

const drawn = (playerIds: string[]) => submitted(playerIds.map((playerId) => [playerId, { done: true, blank: false }]));

const toRating = (playerIds: string[] = PLAYERS) => {
  const { phase, state } = begin();
  return expectPhase(rules.advance(context(state, phase, drawn(playerIds))));
};

const parse = (state: DrawItState, phase: Phase, playerId: string, input: unknown) =>
  rules.parseInput({ config, state, phase, playerId, input });

describe("draw it drawing", () => {
  it("starts with everyone drawing the first word against the clock", () => {
    const { phase, state } = begin();

    expect(phase).toEqual({
      name: "draw",
      durationMs: 60_000,
      input: { from: PLAYERS, endsWhenAllSubmitted: true, replaceable: true, via: "upload" },
    });
    expect(rules.stageView({ ...context(state, phase), totals: {} })).toMatchObject({
      kind: "draw",
      word: "Lighthouse",
      roundIndex: 0,
      roundCount: 2,
      participantIds: PLAYERS,
      doneIds: [],
    });
  });

  it("accepts only whether a drawing is done and blank", () => {
    const { phase, state } = begin();

    expect(parse(state, phase, "priya", { done: false, blank: true })).toEqual({ done: false, blank: true });
    expect(parse(state, phase, "priya", { done: "yes", blank: false })).toBeNull();
    expect(parse(state, phase, "priya", { done: true, blank: false, strokes: [] })).toBeNull();
    expect(parse(state, phase, "priya", { d1: 5 })).toBeNull();
  });

  it("counts a player as finished only once they say they are done", () => {
    const { phase, state } = begin();
    const done = (input: DrawItInput) => rules.isInputDone?.({ config, state, phase, playerId: "priya", input });

    expect(done({ done: false, blank: false })).toBe(false);
    expect(done({ done: true, blank: false })).toBe(true);
  });

  it("shows the artist that they are done", () => {
    const { phase, state } = begin();
    const view = rules.playerView({
      ...context(state, phase, submitted([["priya", { done: true, blank: false }]])),
      totals: {},
      playerId: "priya",
      isParticipant: true,
    });

    expect(view).toMatchObject({ kind: "draw", word: "Lighthouse", isDone: true, drawSeconds: 60 });
  });
});

describe("draw it uploads", () => {
  const stroke = (color: string, points = [[0.1, 0.2, 0.5]]) => ({ color, size: "medium", points });
  const upload = (strokes: unknown[], done = true) => ({ done, drawing: { strokes } });
  const square = [
    [0.1, 0.1],
    [0.4, 0.1],
    [0.4, 0.4],
    [0.1, 0.4],
  ];
  const fill = (color: string, rings: unknown[] = [square]) => ({ kind: "fill", color, rings });
  const parseUpload = (phase: Phase, state: DrawItState, input: unknown) =>
    rules.parseUpload?.({ config, state, phase, playerId: "priya", input });

  it("turns a drawing into whether it is done and blank", () => {
    const { phase, state } = begin();

    expect(parseUpload(phase, state, upload([stroke("red")], false))).toEqual({
      input: { done: false, blank: false },
      payload: { strokes: [stroke("red")] },
    });
    expect(parseUpload(phase, state, upload([]))?.input).toEqual({ done: true, blank: true });
    expect(parseUpload(phase, state, upload([stroke("eraser")]))?.input).toEqual({ done: true, blank: true });
    expect(parseUpload(phase, state, upload([stroke("white"), fill("white")]))?.input).toEqual({
      done: true,
      blank: true,
    });
  });

  it("takes fills next to strokes", () => {
    const { phase, state } = begin();
    const drawing = [stroke("brown"), fill("sky", [square, square.toReversed()])];

    expect(parseUpload(phase, state, upload(drawing))).toEqual({
      input: { done: true, blank: false },
      payload: { strokes: drawing },
    });
  });

  it.each([
    ["an unknown colour", upload([stroke("teal")])],
    ["a fill with the eraser", upload([fill("eraser")])],
    ["a fill without rings", upload([fill("red", [])])],
    ["a fill ring with two points", upload([fill("red", [square.slice(0, 2)])])],
    ["a fill point off the canvas", upload([fill("red", [[...square.slice(0, 3), [1.5, 0.2]]])])],
    ["a fill with extra fields", upload([{ ...fill("red"), size: "thin" }])],
    [
      "too many fill points in total",
      upload(Array.from({ length: 2 }, () => fill("red", [Array(2600).fill([0.1, 0.1])]))),
    ],
    ["a point off the canvas", upload([stroke("red", [[1.2, 0, 0.5]])])],
    ["a stroke without points", upload([stroke("red", [])])],
    ["a point with extra values", upload([stroke("red", [[0.1, 0.1, 0.5, 1]])])],
    ["extra fields", { ...upload([]), name: "Priya" }],
    [
      "too many points in total",
      upload(Array.from({ length: 6 }, () => stroke("red", Array(1000).fill([0.1, 0.1, 0.5])))),
    ],
  ])("rejects %s", (_, body) => {
    const { phase, state } = begin();

    expect(parseUpload(phase, state, body)).toBeNull();
  });

  it("only takes drawings while drawing", () => {
    const { phase, state } = toRating();

    expect(parseUpload(phase, state, upload([stroke("red")]))).toBeNull();
  });

  it("lets only the artist fetch their own drawing while drawing", () => {
    const { phase, state } = begin();
    const owner = (viewer: UploadViewer, id: string) => rules.uploadOwner?.({ config, state, phase, viewer, id });

    expect(owner({ kind: "player", playerId: "priya" }, "mine")).toBe("priya");
    expect(owner({ kind: "host" }, "mine")).toBeNull();
    expect(owner({ kind: "player", playerId: "priya" }, "d1")).toBeNull();
  });

  it("shows drawings to the host and their raters while rating, and to everyone afterwards", () => {
    const { phase, state } = toRating();
    const owner = (viewer: UploadViewer, id: string, current = phase) =>
      rules.uploadOwner?.({ config, state, phase: current, viewer, id });
    const results: Phase = { name: "results", durationMs: 8000, input: null, skippable: true };

    expect(owner({ kind: "host" }, "d2")).toBe("daan");
    expect(owner({ kind: "player", playerId: "priya" }, "d2")).toBe("daan");
    expect(owner({ kind: "player", playerId: "priya" }, "d1")).toBeNull();
    expect(owner({ kind: "player", playerId: "priya" }, "mine")).toBeNull();
    expect(owner({ kind: "host" }, "d9")).toBeNull();
    expect(owner({ kind: "player", playerId: "priya" }, "d1", results)).toBe("priya");
  });
});

describe("draw it rating", () => {
  it("leaves blank and missing drawings out and gives each player drawings to rate", () => {
    const { phase: drawing, state } = begin();
    const submissions = submitted([
      ["priya", { done: true, blank: false }],
      ["daan", { done: false, blank: false }],
      ["lars", { done: true, blank: true }],
    ]);

    const { phase, state: rating } = expectPhase(rules.advance(context(state, drawing, submissions)));

    expect(rating.drawings).toEqual([
      { id: "d1", playerId: "priya" },
      { id: "d2", playerId: "daan" },
    ]);
    expect(rating.assignments).toEqual({ priya: ["d2"], daan: ["d1"], lars: ["d1"], mei: ["d2"] });
    expect(phase).toEqual({
      name: "rate",
      durationMs: 12_000,
      input: { from: ["priya", "daan", "lars", "mei"], endsWhenAllSubmitted: true, replaceable: true },
    });
  });

  it("skips rating when fewer than two drawings came in", () => {
    const { phase, state } = begin();

    const { phase: next, state: results, points } = expectPhase(rules.advance(context(state, phase, drawn(["mei"]))));

    expect(next).toMatchObject({ name: "results", durationMs: 8000, skippable: true });
    expect(results.results).toEqual([
      { drawingId: "d1", playerId: "mei", rank: 1, average: null, ratingCount: 0, points: 0 },
    ]);
    expect(points).toEqual({ mei: 0 });
  });

  it("accepts ratings of 1 to 10 for assigned drawings only", () => {
    const { phase, state } = toRating();
    const [mine = ""] = state.assignments.priya ?? [];

    expect(parse(state, phase, "priya", {})).toEqual({});
    expect(parse(state, phase, "priya", { [mine]: 7 })).toEqual({ [mine]: 7 });
    expect(parse(state, phase, "priya", { d1: 7 })).toBeNull();
    expect(parse(state, phase, "priya", { [mine]: 0 })).toBeNull();
    expect(parse(state, phase, "priya", { [mine]: 11 })).toBeNull();
    expect(parse(state, phase, "priya", { [mine]: 6.5 })).toBeNull();
    expect(parse(state, phase, "priya", [7])).toBeNull();
    expect(parse(state, phase, "priya", { done: true, blank: false })).toBeNull();
  });

  it("counts a rater as finished once every assigned drawing is rated", () => {
    const { phase, state } = toRating();
    const assigned = state.assignments.priya ?? [];
    const done = (input: DrawItInput) => rules.isInputDone?.({ config, state, phase, playerId: "priya", input });

    expect(assigned).toHaveLength(3);
    expect(done({ [assigned[0] ?? ""]: 4 })).toBe(false);
    expect(done(Object.fromEntries(assigned.map((drawingId) => [drawingId, 4])))).toBe(true);
  });

  it("keeps the artists hidden while rating", () => {
    const { phase, state } = toRating();
    const stage = rules.stageView({ ...context(state, phase), totals: {} });
    const phone = rules.playerView({ ...context(state, phase), totals: {}, playerId: "daan", isParticipant: true });

    expect(stage).toEqual({
      kind: "rate",
      word: "Lighthouse",
      roundIndex: 0,
      roundCount: 2,
      drawingIds: ["d1", "d2", "d3", "d4"],
      finishedCount: 0,
      participantCount: 4,
      rateSeconds: 36,
    });
    expect(phone).toMatchObject({ kind: "rate", toRate: ["d3", "d4", "d1"], mine: {} });
    expect(JSON.stringify([stage, phone])).not.toMatch(/priya|lars|mei/);
  });
});

describe("draw it results", () => {
  it("shares a rank between drawings with the same points", () => {
    const { phase, state } = toRating(["priya", "daan", "lars"]);
    const submissions = submitted([
      ["priya", { d2: 6 }],
      ["daan", { d3: 6 }],
    ]);

    const { state: done } = expectPhase(rules.advance(context(state, phase, submissions)));

    expect(done.results.map(({ playerId, rank }) => [playerId, rank])).toEqual([
      ["daan", 1],
      ["lars", 1],
      ["priya", 3],
    ]);
  });

  it("scores each drawing by its average rating and ranks the artists", () => {
    const { phase, state } = toRating(["priya", "daan", "lars"]);
    const submissions = submitted([
      ["priya", { d2: 8, d3: 9 }],
      ["daan", { d3: 6, d1: 3 }],
      ["lars", { d1: 5 }],
    ]);

    const { phase: next, state: done, points } = expectPhase(rules.advance(context(state, phase, submissions)));

    expect(next.name).toBe("results");
    expect(done.results).toEqual([
      { drawingId: "d2", playerId: "daan", rank: 1, average: 8, ratingCount: 1, points: 800 },
      { drawingId: "d3", playerId: "lars", rank: 2, average: 7.5, ratingCount: 2, points: 750 },
      { drawingId: "d1", playerId: "priya", rank: 3, average: 4, ratingCount: 2, points: 400 },
    ]);
    expect(points).toEqual({ priya: 400, daan: 800, lars: 750 });
  });

  it("shows each artist their own result and session rank", () => {
    const { phase, state } = toRating(["priya", "daan"]);
    const { phase: results, state: done } = expectPhase(
      rules.advance(context(state, phase, submitted([["priya", { d2: 9 }]]))),
    );

    const view = rules.playerView({
      ...context(done, results),
      totals: { priya: 1500, daan: 900 },
      playerId: "daan",
      isParticipant: false,
    });

    expect(view).toEqual({
      kind: "results",
      word: "Lighthouse",
      roundIndex: 0,
      roundCount: 2,
      result: { rank: 1, average: 9, points: 900 },
      total: 900,
      rank: 2,
    });
  });

  it("moves to the next word, then ends after the last one", () => {
    const { phase, state } = toRating();
    const { phase: results, state: scored } = expectPhase(rules.advance(context(state, phase)));

    const { phase: next, state: second } = expectPhase(rules.advance(context(scored, results)));
    expect(next.name).toBe("draw");
    expect(second).toEqual({ roundIndex: 1, drawings: [], assignments: {}, results: [] });

    expect(rules.advance(context({ ...scored, roundIndex: 1 }, results))).toEqual({ phase: null });
  });
});

describe("draw it rating assignments", () => {
  const drawingsFor = (count: number) =>
    Array.from({ length: count }, (_, index) => ({ id: `d${index + 1}`, playerId: `p${index + 1}` }));

  it.each([2, 3, 6, 12, 40])("rates every one of %i drawings equally, never your own", (count) => {
    const drawings = drawingsFor(count);
    const assignments = assignRatings(
      drawings,
      drawings.map((drawing) => drawing.playerId),
    );
    const perPlayer = Math.min(5, count - 1);
    const received = drawings.map(
      (drawing) => Object.values(assignments).filter((ids) => ids.includes(drawing.id)).length,
    );

    expect(Object.values(assignments).every((ids) => new Set(ids).size === perPlayer)).toBe(true);
    expect(received.every((total) => total === perPlayer)).toBe(true);
    expect(drawings.every((drawing) => !assignments[drawing.playerId]?.includes(drawing.id))).toBe(true);
  });

  it("gives players without a drawing their own share to rate", () => {
    const assignments = assignRatings(drawingsFor(6), ["p1", "p2", "p3", "p4", "p5", "p6", "late1", "late2"]);

    expect(assignments.late1).toEqual(["d1", "d2", "d3", "d4", "d5"]);
    expect(assignments.late2).toEqual(["d6", "d1", "d2", "d3", "d4"]);
  });
});

describe("draw it scoring", () => {
  it("rounds the average to one decimal and awards 100 points per star", () => {
    expect(averageOf([8, 9, 8])).toBe(8.3);
    expect(averageOf([])).toBeNull();
    expect(drawingPoints(8.3)).toBe(830);
    expect(drawingPoints(null)).toBe(0);
  });
});
