import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { defaultPopQuizConfig, emptyQuestion, isQuestionComplete, type QuizQuestion } from "./pop-quiz/config.js";
import { type GameSetup, hasUniqueIds, isGameReady, isSetupReady, summarizeGame } from "./setup.js";
import { SessionSetupSchema } from "./setup-schema.js";

const complete: QuizQuestion = {
  id: "q1",
  text: "Which planet has the most known moons?",
  answers: { squircle: "Jupiter", triangle: "Saturn", plus: "Uranus", dome: "Neptune" },
  correct: "triangle",
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
    expect(isQuestionComplete({ ...complete, text: "  " })).toBe(false);
    expect(isQuestionComplete({ ...complete, answers: { ...complete.answers, plus: "" } })).toBe(false);
    expect(isQuestionComplete({ ...complete, correct: null })).toBe(false);
  });

  it("is ready only when every game has questions and all of them are complete", () => {
    expect(isGameReady(quiz([complete]))).toBe(true);
    expect(isGameReady(quiz([]))).toBe(false);
    expect(isGameReady(quiz([complete, emptyQuestion("q2")]))).toBe(false);
    expect(isSetupReady({ name: "", games: [] })).toBe(false);
    expect(isSetupReady({ name: "", games: [quiz([complete])] })).toBe(true);
  });

  it("spots duplicate game and question ids", () => {
    expect(hasUniqueIds({ name: "", games: [quiz([complete]), quiz([complete], "quiz-2")] })).toBe(true);
    expect(hasUniqueIds({ name: "", games: [quiz([complete]), quiz([complete])] })).toBe(false);
    expect(hasUniqueIds({ name: "", games: [quiz([complete, complete])] })).toBe(false);
  });

  it("summarises a quiz for the lobby", () => {
    expect(summarizeGame(quiz([complete, complete]))).toEqual({
      id: "quiz-1",
      type: "pop-quiz",
      roundCount: 2,
      roundSeconds: 20,
    });
  });
});
