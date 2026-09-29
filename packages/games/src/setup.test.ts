import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { type DrawItWord, defaultDrawItConfig } from "./draw-it/config.js";
import { defaultPopQuizConfig, emptyQuestion, isQuestionComplete, type QuizQuestion } from "./pop-quiz/config.js";
import { type GameSetup, isGameReady, isSetupReady, isSetupValid, setupImageIds, summarizeGame } from "./setup.js";
import { SessionSetupSchema } from "./setup-schema.js";

const complete: QuizQuestion = {
  ...emptyQuestion("q1"),
  text: [{ text: "Which planet has the " }, { text: "most", italic: true }, { text: " known moons?" }],
  answers: { squircle: "Jupiter", triangle: "Saturn", plus: "Uranus", dome: "Neptune" },
  correct: "triangle",
};

const trueFalse: QuizQuestion = {
  ...emptyQuestion("q2"),
  kind: "trueFalse",
  text: [{ text: "Pluto is a planet" }],
  answers: { squircle: "False", triangle: "", plus: "True", dome: "" },
  correct: "squircle",
};

const quiz = (questions: QuizQuestion[], id = "quiz-1"): GameSetup => ({
  id,
  type: "pop-quiz",
  config: { ...defaultPopQuizConfig("q1"), questions },
});

describe("session setup schema", () => {
  it("accepts a new quiz straight from the defaults", () => {
    expect(Value.Check(SessionSetupSchema, { name: "", games: [quiz([emptyQuestion("q1")])] })).toBe(true);
  });

  it.each([
    ["an answer that is too long", { ...complete, answers: { ...complete.answers, dome: "x".repeat(41) } }],
    ["an unknown correct answer", { ...complete, correct: "hexagon" }],
    ["an id with unexpected characters", { ...complete, id: "q 1" }],
    ["an extra field", { ...complete, image: "cat.png" }],
    ["an unknown mark", { ...complete, text: [{ text: "Hi", strike: true }] }],
    ["an empty text run", { ...complete, text: [{ text: "" }] }],
    ["more than 40 text runs", { ...complete, text: Array.from({ length: 41 }, () => ({ text: "x" })) }],
    ["more than 9 images", { ...complete, images: Array.from({ length: 10 }, (_, index) => `img${index}`) }],
    ["an unknown time limit", { ...complete, timeLimitSeconds: 45 }],
    ["unknown points", { ...complete, points: "triple" }],
    ["an unknown question kind", { ...complete, kind: "poll" }],
    ["a missing question kind", { ...complete, kind: undefined }],
  ])("rejects %s", (_, question) => {
    expect(Value.Check(SessionSetupSchema, { name: "", games: [quiz([question as QuizQuestion])] })).toBe(false);
  });

  it("allows at most 10 games", () => {
    const games = Array.from({ length: 11 }, (_, index) => quiz([complete], `quiz-${index}`));

    expect(Value.Check(SessionSetupSchema, { name: "", games })).toBe(false);
  });
});

describe("quiz readiness", () => {
  it("needs the question, all four answers and a correct answer", () => {
    expect(isQuestionComplete(complete)).toBe(true);
    expect(isQuestionComplete({ ...complete, text: [{ text: "  ", bold: true }] })).toBe(false);
    expect(isQuestionComplete({ ...complete, text: [] })).toBe(false);
    expect(isQuestionComplete({ ...complete, answers: { ...complete.answers, plus: "" } })).toBe(false);
    expect(isQuestionComplete({ ...complete, correct: null })).toBe(false);
  });

  it("needs only the two answers of a true or false question", () => {
    expect(isQuestionComplete(trueFalse)).toBe(true);
    expect(isQuestionComplete({ ...trueFalse, answers: { ...trueFalse.answers, plus: " " } })).toBe(false);
    expect(isQuestionComplete({ ...trueFalse, correct: null })).toBe(false);
  });

  it("rejects hidden answers on a true or false question", () => {
    const setupWith = (question: QuizQuestion) => ({ name: "", games: [quiz([complete, question])] });

    expect(isSetupValid(setupWith(trueFalse))).toBe(true);
    expect(isSetupValid(setupWith({ ...trueFalse, answers: { ...trueFalse.answers, triangle: "Maybe" } }))).toBe(false);
    expect(isSetupValid(setupWith({ ...trueFalse, correct: "dome" }))).toBe(false);
  });

  it("is ready only when every game has questions and all of them are complete", () => {
    expect(isGameReady(quiz([complete]))).toBe(true);
    expect(isGameReady(quiz([]))).toBe(false);
    expect(isGameReady(quiz([complete, emptyQuestion("q2")]))).toBe(false);
    expect(isSetupReady({ name: "", games: [] })).toBe(false);
    expect(isSetupReady({ name: "", games: [quiz([complete])] })).toBe(true);
  });

  it("spots duplicate game and question ids", () => {
    expect(isSetupValid({ name: "", games: [quiz([complete]), quiz([complete], "quiz-2")] })).toBe(true);
    expect(isSetupValid({ name: "", games: [quiz([complete]), quiz([complete])] })).toBe(false);
    expect(isSetupValid({ name: "", games: [quiz([complete, complete])] })).toBe(false);
  });

  it("limits the visible question text, not the formatting", () => {
    const runs = (count: number) =>
      Array.from({ length: count }, (_, index) => ({ text: "xxx", bold: index % 2 === 0 }));

    expect(isSetupValid({ name: "", games: [quiz([{ ...complete, text: runs(30) }])] })).toBe(true);
    expect(
      isSetupValid({ name: "", games: [quiz([{ ...complete, text: [{ text: "Who is our best 👩‍💻?" }] }])] }),
    ).toBe(true);
    expect(
      isSetupValid({
        name: "",
        games: [quiz([{ ...complete, text: [{ text: "x".repeat(60) }, { text: "y".repeat(31) }] }])],
      }),
    ).toBe(false);
    expect(isSetupValid({ name: "", games: [quiz([{ ...complete, text: [{ text: "a\u200bb" }] }])] })).toBe(false);
  });

  it("collects every image used across the setup once", () => {
    const withImages = (id: string, images: string[]) => ({ ...complete, id, images });
    const setup = { name: "", games: [quiz([withImages("q1", ["a", "b"]), withImages("q2", ["b", "c"])])] };

    expect(setupImageIds(setup)).toEqual(["a", "b", "c"]);
  });

  it("summarises a quiz for the lobby", () => {
    expect(summarizeGame(quiz([complete, complete]))).toEqual({
      id: "quiz-1",
      type: "pop-quiz",
      roundCount: 2,
      roundSeconds: { min: 20, max: 20 },
    });
  });

  it("summarises the shortest and longest question time of a quiz", () => {
    const quick = { ...complete, id: "q1", timeLimitSeconds: 10 };
    const slow = { ...complete, id: "q2", timeLimitSeconds: 120 };
    const usual = { ...complete, id: "q3" };

    expect(summarizeGame(quiz([quick, slow, usual])).roundSeconds).toEqual({ min: 10, max: 120 });
    expect(summarizeGame(quiz([])).roundSeconds).toEqual({ min: 20, max: 20 });
  });
});

const drawIt = (words: DrawItWord[], id = "draw-1"): GameSetup => ({
  id,
  type: "draw-it",
  config: { ...defaultDrawItConfig("w1"), words },
});

const lighthouse: DrawItWord = { id: "w1", text: "Lighthouse" };

describe("draw it setup", () => {
  it("accepts a new game straight from the defaults", () => {
    const game: GameSetup = { id: "draw-1", type: "draw-it", config: defaultDrawItConfig("w1") };

    expect(Value.Check(SessionSetupSchema, { name: "", games: [game, quiz([complete])] })).toBe(true);
  });

  it.each([
    ["a word that is too long", { ...defaultDrawItConfig("w1"), words: [{ id: "w1", text: "x".repeat(41) }] }],
    ["an unknown draw time", { ...defaultDrawItConfig("w1"), drawSeconds: 45 }],
    [
      "more than 10 words",
      { ...defaultDrawItConfig("w1"), words: Array.from({ length: 11 }, (_, i) => ({ id: `w${i}`, text: "Cat" })) },
    ],
    ["an extra field", { ...defaultDrawItConfig("w1"), wordList: "animals" }],
    ["quiz questions", defaultPopQuizConfig("q1")],
  ])("rejects %s", (_, config) => {
    expect(Value.Check(SessionSetupSchema, { name: "", games: [{ id: "draw-1", type: "draw-it", config }] })).toBe(
      false,
    );
  });

  it("is ready only when every round has a word", () => {
    expect(isGameReady(drawIt([lighthouse]))).toBe(true);
    expect(isGameReady(drawIt([]))).toBe(false);
    expect(isGameReady(drawIt([lighthouse, { id: "w2", text: "  " }]))).toBe(false);
  });

  it("spots duplicate word ids and hidden characters", () => {
    expect(isSetupValid({ name: "", games: [drawIt([lighthouse, { id: "w2", text: "Cat" }]), quiz([complete])] })).toBe(
      true,
    );
    expect(isSetupValid({ name: "", games: [drawIt([lighthouse, lighthouse])] })).toBe(false);
    expect(isSetupValid({ name: "", games: [drawIt([{ id: "w1", text: "Li\u200bghthouse" }])] })).toBe(false);
    expect(isSetupValid({ name: "", games: [drawIt([lighthouse], "same"), quiz([complete], "same")] })).toBe(false);
  });

  it("uses no images", () => {
    expect(setupImageIds({ name: "", games: [drawIt([lighthouse])] })).toEqual([]);
  });

  it("summarises the rounds and draw time for the lobby", () => {
    const game: GameSetup = {
      id: "draw-1",
      type: "draw-it",
      config: { words: [lighthouse, { id: "w2", text: "Cat" }], drawSeconds: 90 },
    };

    expect(summarizeGame(game)).toEqual({
      id: "draw-1",
      type: "draw-it",
      roundCount: 2,
      roundSeconds: { min: 90, max: 90 },
    });
  });
});
