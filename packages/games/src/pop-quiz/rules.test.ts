import { describe, expect, it } from "vitest";
import type { Phase, PhaseChange, Points, Submission } from "../rules.js";
import {
  defaultPopQuizConfig,
  emptyQuestion,
  type PopQuizConfig,
  type QuizAnswerKey,
  type QuizQuestion,
} from "./config.js";
import { type QuizState, popQuizRules as rules } from "./rules.js";
import { buildLeaderboard, POP_QUIZ_AUTO_NEXT_MS, POP_QUIZ_READ_MS, quizPoints } from "./scoring.js";

const moons: QuizQuestion = {
  ...emptyQuestion("q1"),
  text: [{ text: "Which planet has the " }, { text: "most", bold: true }, { text: " known moons?" }],
  images: ["img1", "img2"],
  answers: { squircle: "Jupiter", triangle: "Saturn", plus: "Uranus", dome: "Neptune" },
  correct: "triangle",
};

const capital: QuizQuestion = {
  ...emptyQuestion("q2"),
  text: [{ text: "What is the capital of Portugal?" }],
  answers: { squircle: "Lisbon", triangle: "Porto", plus: "Faro", dome: "Braga" },
  correct: "squircle",
};

const pluto: QuizQuestion = {
  ...emptyQuestion("q3"),
  kind: "trueFalse",
  text: [{ text: "Pluto is a planet" }],
  answers: { squircle: "False", triangle: "", plus: "True", dome: "" },
  correct: "squircle",
};

const PLAYERS = ["priya", "daan", "lars"];
const STARTED_AT = 1_000;

const quizConfig = (overrides: Partial<PopQuizConfig> = {}): PopQuizConfig => ({
  ...defaultPopQuizConfig("q1"),
  questions: [moons, capital],
  timeLimitSeconds: 20,
  ...overrides,
});

const sequence = (values: number[]) => {
  const queue = [...values];
  return () => queue.shift() ?? 0.5;
};

const answers = (entries: [string, QuizAnswerKey, number][]) =>
  new Map<string, Submission<QuizAnswerKey>>(
    entries.map(([playerId, input, ms]) => [playerId, { input, at: STARTED_AT + ms }]),
  );

const expectPhase = (change: PhaseChange<QuizState>) => {
  if (change.phase === null) throw new Error("expected another phase");
  return { phase: change.phase, state: change.state, points: change.points };
};

const advance = (
  config: PopQuizConfig,
  state: QuizState,
  phase: Phase,
  submissions = new Map<string, Submission<QuizAnswerKey>>(),
) =>
  rules.advance({
    config,
    state,
    phase,
    phaseStartedAt: STARTED_AT,
    submissions,
    playerIds: PLAYERS,
    random: () => 0.5,
  });

const toAnswering = (config: PopQuizConfig, random = () => 0.5) => {
  const started = rules.begin({ config, playerIds: PLAYERS, random });
  return { question: started, answering: expectPhase(advance(config, started.state, started.phase)) };
};

const viewContext = (
  config: PopQuizConfig,
  state: QuizState,
  phase: Phase,
  { submissions = new Map<string, Submission<QuizAnswerKey>>(), totals = {} as Points } = {},
) => ({ config, state, phase, phaseStartedAt: STARTED_AT, submissions, totals });

describe("quiz points", () => {
  it("gives full points for an instant answer and half at the buzzer", () => {
    const base = { points: 1000, speedBonus: true, limitMs: 20_000 };

    expect(quizPoints({ ...base, elapsedMs: 0 })).toBe(1000);
    expect(quizPoints({ ...base, elapsedMs: 10_000 })).toBe(750);
    expect(quizPoints({ ...base, elapsedMs: 20_000 })).toBe(500);
    expect(quizPoints({ ...base, elapsedMs: 25_000 })).toBe(500);
    expect(quizPoints({ ...base, elapsedMs: 3_333 })).toBe(917);
  });

  it("gives flat points without the speed bonus", () => {
    expect(quizPoints({ points: 2000, speedBonus: false, limitMs: 10_000, elapsedMs: 9_999 })).toBe(2000);
  });
});

describe("pop quiz rules", () => {
  it("shows the question alone, then opens answering for every player", () => {
    const { question, answering } = toAnswering(quizConfig());

    expect(question.phase).toEqual({ name: "question", durationMs: POP_QUIZ_READ_MS, input: null });
    expect(answering.phase).toEqual({
      name: "answering",
      durationMs: 20_000,
      input: { from: PLAYERS, endsWhenAllSubmitted: true },
    });
  });

  it("scores right answers by speed and leaves wrong ones at zero", () => {
    const config = quizConfig({ autoNextQuestion: false });
    const { answering } = toAnswering(config);

    const reveal = expectPhase(
      advance(
        config,
        answering.state,
        answering.phase,
        answers([
          ["priya", "triangle", 0],
          ["daan", "triangle", 10_000],
          ["lars", "dome", 1_000],
        ]),
      ),
    );

    expect(reveal.phase).toEqual({ name: "reveal", durationMs: null, input: null });
    expect(reveal.points).toEqual({ priya: 1000, daan: 750, lars: 0 });
  });

  it("uses a question's own time limit over the quiz default", () => {
    const config = quizConfig({ questions: [{ ...moons, timeLimitSeconds: 120 }] });
    const { answering } = toAnswering(config);

    expect(answering.phase.durationMs).toBe(120_000);
    expect(rules.stageView(viewContext(config, answering.state, answering.phase))).toMatchObject({
      timeLimitSeconds: 120,
    });

    const reveal = expectPhase(
      advance(config, answering.state, answering.phase, answers([["priya", "triangle", 60_000]])),
    );
    expect(reveal.points).toEqual({ priya: 750 });
  });

  it("doubles the points on a double points question", () => {
    const config = quizConfig({ questions: [{ ...moons, points: "double" }] });
    const { answering } = toAnswering(config);

    const reveal = expectPhase(
      advance(
        config,
        answering.state,
        answering.phase,
        answers([
          ["priya", "triangle", 0],
          ["daan", "triangle", 10_000],
        ]),
      ),
    );
    expect(reveal.points).toEqual({ priya: 2000, daan: 1500 });
  });

  it("shows the formatted question and its images on the big screen while asking", () => {
    const config = quizConfig();
    const { question, answering } = toAnswering(config);

    for (const { state, phase } of [question, answering]) {
      expect(rules.stageView(viewContext(config, state, phase))).toMatchObject({
        text: moons.text,
        images: ["img1", "img2"],
      });
    }
  });

  it("names the next question's images during the reveal so the big screen can load them early", () => {
    const config = quizConfig({ questions: [capital, moons] });
    const { answering } = toAnswering(config);
    const reveal = expectPhase(advance(config, answering.state, answering.phase));
    const nextQuestion = expectPhase(advance(config, reveal.state, reveal.phase));
    const nextAnswering = expectPhase(advance(config, nextQuestion.state, nextQuestion.phase));
    const lastReveal = expectPhase(advance(config, nextAnswering.state, nextAnswering.phase));

    expect(rules.stageView(viewContext(config, reveal.state, reveal.phase))).toMatchObject({
      nextImages: ["img1", "img2"],
    });
    expect(rules.stageView(viewContext(config, lastReveal.state, lastReveal.phase))).toMatchObject({ nextImages: [] });
  });

  it("goes to the next question after the reveal, and ends after the last one", () => {
    const config = quizConfig();
    const { answering } = toAnswering(config);
    const reveal = expectPhase(advance(config, answering.state, answering.phase));

    const next = expectPhase(advance(config, reveal.state, reveal.phase));
    expect(next.phase.name).toBe("question");
    expect(next.state.questionIndex).toBe(1);

    const lastAnswering = expectPhase(advance(config, next.state, next.phase));
    const lastReveal = expectPhase(advance(config, lastAnswering.state, lastAnswering.phase));
    expect(advance(config, lastReveal.state, lastReveal.phase)).toEqual({ phase: null });
  });

  it("times the reveal and lets the host skip it when the quiz moves on automatically", () => {
    const config = quizConfig();
    const { answering } = toAnswering(config);

    const reveal = expectPhase(advance(config, answering.state, answering.phase));

    expect(reveal.phase).toEqual({ name: "reveal", durationMs: POP_QUIZ_AUTO_NEXT_MS, input: null, skippable: true });
    expect(expectPhase(advance(config, reveal.state, reveal.phase)).phase.name).toBe("question");
  });

  it("moves on automatically when a saved quiz has no auto next setting", () => {
    const { autoNextQuestion: _, ...config } = quizConfig();
    const { answering } = toAnswering(config);

    const reveal = expectPhase(advance(config, answering.state, answering.phase));

    expect(reveal.phase.durationMs).toBe(POP_QUIZ_AUTO_NEXT_MS);
  });

  it("only takes an answer shape while answering", () => {
    const config = quizConfig();
    const { question, answering } = toAnswering(config);
    const parse = (phase: Phase, input: unknown) =>
      rules.parseInput({ config, state: answering.state, phase, playerId: "priya", input });

    expect(parse(answering.phase, "plus")).toBe("plus");
    expect(parse(answering.phase, "hexagon")).toBeNull();
    expect(parse(answering.phase, { shape: "plus" })).toBeNull();
    expect(parse(question.phase, "plus")).toBeNull();
  });

  it("shuffles answers onto other shapes and scores against the shuffled layout", () => {
    const config = quizConfig({ shuffleAnswers: true });
    const { answering } = toAnswering(config, sequence([0.9, 0.6, 0.3, 0.1]));

    const stage = rules.stageView(viewContext(config, answering.state, answering.phase));
    expect(stage).toMatchObject({
      answers: [
        { shape: "squircle", text: "Neptune" },
        { shape: "triangle", text: "Uranus" },
        { shape: "plus", text: "Saturn" },
        { shape: "dome", text: "Jupiter" },
      ],
    });

    const reveal = expectPhase(
      advance(
        config,
        answering.state,
        answering.phase,
        answers([
          ["priya", "plus", 0],
          ["daan", "triangle", 0],
        ]),
      ),
    );
    expect(reveal.points).toEqual({ priya: 1000, daan: 0 });
    expect(rules.stageView(viewContext(config, reveal.state, reveal.phase))).toMatchObject({ correct: "plus" });
  });

  it("shows a true or false question as two answers in their own order, even with shuffling on", () => {
    const config = quizConfig({ questions: [pluto], shuffleAnswers: true });
    const { answering } = toAnswering(config, sequence([0.9, 0.1]));
    const parse = (input: unknown) =>
      rules.parseInput({ config, state: answering.state, phase: answering.phase, playerId: "priya", input });

    expect(rules.stageView(viewContext(config, answering.state, answering.phase))).toMatchObject({
      answers: [
        { shape: "plus", text: "True" },
        { shape: "squircle", text: "False" },
      ],
    });
    expect(parse("squircle")).toBe("squircle");
    expect(parse("triangle")).toBeNull();

    const reveal = expectPhase(
      advance(
        config,
        answering.state,
        answering.phase,
        answers([
          ["priya", "squircle", 0],
          ["daan", "plus", 0],
        ]),
      ),
    );
    expect(reveal.points).toEqual({ priya: 1000, daan: 0 });
    expect(rules.stageView(viewContext(config, reveal.state, reveal.phase))).toMatchObject({
      answers: [
        { shape: "plus", text: "True" },
        { shape: "squircle", text: "False" },
      ],
      correct: "squircle",
    });
  });

  it("never tells any screen the correct answer before the reveal", () => {
    const config = quizConfig();
    const { question, answering } = toAnswering(config);
    const submissions = answers([["priya", "triangle", 0]]);

    const views = [question, answering].flatMap(({ state, phase }) => {
      const context = viewContext(config, state, phase, { submissions });
      return [rules.stageView(context), rules.playerView({ ...context, playerId: "daan", isParticipant: true })];
    });

    for (const view of views) expect(JSON.stringify(view)).not.toMatch(/correct|isCorrect/);
    expect(
      JSON.stringify(
        rules.playerView({
          ...viewContext(config, question.state, question.phase),
          playerId: "daan",
          isParticipant: true,
        }),
      ),
    ).not.toContain("Saturn");
  });

  it("never sends a question's image hint to any screen", () => {
    const config = quizConfig({ questions: [{ ...moons, imageHint: "Saturn rings close-up" }, capital] });
    const { question, answering } = toAnswering(config);
    const reveal = expectPhase(advance(config, answering.state, answering.phase));

    const views = [question, answering, reveal].flatMap(({ state, phase }) => {
      const context = viewContext(config, state, phase);
      return [rules.stageView(context), rules.playerView({ ...context, playerId: "daan", isParticipant: true })];
    });

    for (const view of views) expect(JSON.stringify(view)).not.toMatch(/imageHint|rings close-up/);
  });

  it("shows only a player's own answer while answering", () => {
    const config = quizConfig();
    const { answering } = toAnswering(config);
    const context = viewContext(config, answering.state, answering.phase, {
      submissions: answers([["priya", "triangle", 0]]),
    });

    expect(rules.playerView({ ...context, playerId: "priya", isParticipant: true })).toMatchObject({
      mine: "triangle",
    });
    expect(rules.playerView({ ...context, playerId: "daan", isParticipant: true })).toMatchObject({ mine: null });
    expect(rules.stageView(context)).toMatchObject({ answeredCount: 1, participantCount: 3 });
  });

  it("reveals counts, the fastest right answer and each player's result", () => {
    const config = quizConfig();
    const { answering } = toAnswering(config);
    const reveal = expectPhase(
      advance(
        config,
        answering.state,
        answering.phase,
        answers([
          ["priya", "triangle", 4_000],
          ["daan", "triangle", 2_100],
          ["lars", "dome", 500],
        ]),
      ),
    );
    const totals = reveal.points ?? {};
    const context = viewContext(config, reveal.state, reveal.phase, { totals });

    expect(rules.stageView(context)).toMatchObject({
      kind: "reveal",
      correct: "triangle",
      counts: { squircle: 0, triangle: 2, plus: 0, dome: 1 },
      correctCount: 2,
      participantCount: 3,
      fastest: { playerId: "daan", ms: 2_100 },
    });
    expect(rules.playerView({ ...context, playerId: "daan", isParticipant: false })).toEqual({
      kind: "reveal",
      questionIndex: 0,
      questionCount: 2,
      correct: { shape: "triangle", text: "Saturn" },
      result: { shape: "triangle", isCorrect: true, points: 948 },
      total: 948,
      rank: 1,
    });
    expect(rules.playerView({ ...context, playerId: "late", isParticipant: false })).toMatchObject({
      result: null,
      rank: 3,
    });
  });

  it("adds the leaderboard to the reveal only when the quiz asks for it", () => {
    const withBoard = quizConfig({ leaderboardAfterEachQuestion: true });
    const without = quizConfig({ leaderboardAfterEachQuestion: false });
    const { answering } = toAnswering(withBoard);
    const reveal = expectPhase(
      advance(withBoard, answering.state, answering.phase, answers([["priya", "triangle", 0]])),
    );
    const totals = { priya: 1000 };

    expect(rules.stageView(viewContext(withBoard, reveal.state, reveal.phase, { totals }))).toMatchObject({
      leaderboard: { entries: [{ playerId: "priya", rank: 1, previousRank: null, total: 1000, gain: 1000 }] },
    });
    expect(rules.stageView(viewContext(without, reveal.state, reveal.phase, { totals }))).toMatchObject({
      leaderboard: null,
    });
  });
});

describe("leaderboard", () => {
  it("ranks by total, shares ranks on ties and tracks movement", () => {
    const board = buildLeaderboard({ priya: 1500, daan: 1800, lars: 1500 }, { daan: 1000, priya: 0 });

    expect(board.entries).toEqual([
      { playerId: "daan", rank: 1, previousRank: 3, total: 1800, gain: 1000 },
      { playerId: "lars", rank: 2, previousRank: 1, total: 1500, gain: 0 },
      { playerId: "priya", rank: 2, previousRank: 1, total: 1500, gain: 0 },
    ]);
  });

  it("shows no movement before anyone had points, but does after an earlier game", () => {
    expect(buildLeaderboard({ priya: 900 }, { priya: 900 }).entries[0]?.previousRank).toBeNull();
    expect(buildLeaderboard({ priya: 900, daan: 1200 }, { daan: 1200 }).entries[0]).toMatchObject({
      playerId: "daan",
      rank: 1,
      previousRank: 2,
    });
  });

  it("keeps the top entries and counts everyone ranked", () => {
    const totals = Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`p${index}`, index * 100]));

    const board = buildLeaderboard(totals, {}, 5);

    expect(board.entries.map((entry) => entry.playerId)).toEqual(["p7", "p6", "p5", "p4", "p3"]);
    expect(board.rankedCount).toBe(8);
  });
});
