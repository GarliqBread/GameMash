import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import {
  AI_REPLY_MAX_LENGTH,
  type AiParseOptions,
  type AiReplyError,
  type AiReplyResult,
  aiPrompt,
  parseAiReply,
} from "./ai.js";
import { type GameSetup, type GameType, isGameReady, isSetupValid } from "./setup.js";
import { SessionSetupSchema } from "./setup-schema.js";

const counter = (prefix: string) => {
  let next = 0;
  return () => {
    next += 1;
    return `${prefix}${next}`;
  };
};

const options = (withImageIdeas = true): AiParseOptions => {
  const newItemId = counter("id");
  return { idsOf: (type) => ({ newGameId: () => `game-${type}`, newItemId }), withImageIdeas };
};

const question = (overrides: Record<string, unknown> = {}) => ({
  question: "Which planet has the most known moons?",
  answers: ["Jupiter", "Saturn", "Uranus", "Neptune"],
  correct: 1,
  ...overrides,
});

const quizReply = (questions: unknown) => JSON.stringify({ questions });

const parse = (reply: string, types: GameType[], withImageIdeas = true) =>
  parseAiReply(reply, types, options(withImageIdeas));

const parseQuiz = (reply: string, withImageIdeas = true) => parse(reply, ["pop-quiz"], withImageIdeas);

const parseWords = (reply: string) => parse(reply, ["draw-it"]);

const errorsOf = (result: AiReplyResult<GameSetup[]>) => (result.ok ? [] : result.errors);

const inList = (list: "questions" | "words", errors: AiReplyError[]) => errors.map((error) => ({ ...error, list }));

const expectPlayable = (result: AiReplyResult<GameSetup[]>) => {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  const setup = { name: "", games: result.value };
  expect(Value.Check(SessionSetupSchema, setup)).toBe(true);
  expect(isSetupValid(setup)).toBe(true);
  for (const game of result.value) expect(isGameReady(game)).toBe(true);
  return result.value;
};

const firstQuiz = (result: AiReplyResult<GameSetup[]>) => {
  const game = expectPlayable(result)[0];
  if (game?.type !== "pop-quiz") throw new Error("expected a quiz");
  return game;
};

describe("reading an AI reply", () => {
  it("reads plain JSON", () => {
    expect(parseQuiz(quizReply([question()])).ok).toBe(true);
  });

  it("reads the first code block and ignores the chat around it", () => {
    const reply = `Sure! Here is your quiz:\n\n\`\`\`json\n${quizReply([question()])}\n\`\`\`\n\nHave fun! \`\`\`{}\`\`\``;
    expect(parseQuiz(reply).ok).toBe(true);
  });

  it("reads a code block on one line", () => {
    expect(parseWords('Words: ```{"words": ["cat"]}``` done').ok).toBe(true);
    expect(parseWords('```JSON {"words": ["cat"]}```').ok).toBe(true);
  });

  it("reads a code block without a language", () => {
    expect(parseQuiz(`\`\`\`\n${quizReply([question()])}\n\`\`\``).ok).toBe(true);
  });

  it.each([
    ["text that isn't JSON", "Sorry, I can't help with that"],
    ["broken JSON", '{"questions": ['],
    ["an empty paste", "   "],
    ["a reply that is too long", " ".repeat(AI_REPLY_MAX_LENGTH + 1)],
  ])("refuses %s", (_, reply) => {
    expect(errorsOf(parseQuiz(reply))).toEqual([{ code: "not_json" }]);
  });

  it("refuses a list instead of an object", () => {
    expect(errorsOf(parseQuiz(JSON.stringify([question()])))).toEqual([{ code: "wrong_format" }]);
  });

  it("refuses questions that aren't a list", () => {
    expect(errorsOf(parseQuiz(JSON.stringify({ questions: "none" })))).toEqual([
      { code: "wrong_format", list: "questions" },
    ]);
  });

  it.each([
    ["a missing list", JSON.stringify({ words: ["cat"] })],
    ["an empty list", quizReply([])],
  ])("refuses %s", (_, reply) => {
    expect(errorsOf(parseQuiz(reply))).toEqual([{ code: "no_items", list: "questions" }]);
  });

  it("refuses more questions than a quiz can hold", () => {
    const questions = Array.from({ length: 51 }, () => question());
    expect(errorsOf(parseQuiz(quizReply(questions)))).toEqual([{ code: "too_many_items", list: "questions", max: 50 }]);
  });
});

describe("Pop quiz from an AI reply", () => {
  it("builds a playable quiz with new ids and default rules", () => {
    const game = firstQuiz(parseQuiz(quizReply([question(), question({ correct: 3 })])));
    expect(game.id).toBe("game-pop-quiz");
    expect(game.config.timeLimitSeconds).toBe(20);
    expect(game.config.questions.map((entry) => entry.id)).toEqual(["id1", "id2"]);
    expect(game.config.questions[0]).toMatchObject({
      kind: "choice",
      text: [{ text: "Which planet has the most known moons?" }],
      answers: { squircle: "Jupiter", triangle: "Saturn", plus: "Uranus", dome: "Neptune" },
      correct: "triangle",
      images: [],
      timeLimitSeconds: null,
      points: "standard",
    });
    expect(game.config.questions[1]?.correct).toBe("dome");
  });

  it("puts true on plus and false on squircle", () => {
    const reply = quizReply([question({ question: "Pluto is a planet", answers: ["True", "False"], correct: 1 })]);
    expect(firstQuiz(parseQuiz(reply)).config.questions[0]).toMatchObject({
      kind: "trueFalse",
      answers: { squircle: "False", triangle: "", plus: "True", dome: "" },
      correct: "squircle",
    });
  });

  it("keeps image ideas as hints when images are on", () => {
    const game = firstQuiz(parseQuiz(quizReply([question({ imageIdea: "  Saturn's rings  " })])));
    expect(game.config.questions[0]?.imageHint).toBe("Saturn's rings");
  });

  it.each([
    ["images are off", { imageIdea: "Saturn" }, false],
    ["the idea is empty", { imageIdea: " " }, true],
    ["the idea isn't text", { imageIdea: 42 }, true],
  ])("leaves the hint out when %s", (_, overrides, withImageIdeas) => {
    const game = firstQuiz(parseQuiz(quizReply([question(overrides)]), withImageIdeas));
    expect(game.config.questions[0]).not.toHaveProperty("imageHint");
  });

  it("removes hidden characters and surrounding spaces", () => {
    const reply = quizReply([question({ question: " Moons​? ", answers: ["a\u0000", "b", "c", "d"] })]);
    const game = firstQuiz(parseQuiz(reply));
    expect(game.config.questions[0]?.text).toEqual([{ text: "Moons?" }]);
    expect(game.config.questions[0]?.answers.squircle).toBe("a");
  });

  it("allows the longest question and answer", () => {
    expectPlayable(
      parseQuiz(quizReply([question({ question: "q".repeat(200), answers: ["a".repeat(40), "b", "c", "d"] })])),
    );
  });

  it.each([
    ["not an object", "question?", [{ code: "item_wrong_format", item: 1 }]],
    ["missing answers", question({ answers: undefined }), [{ code: "item_wrong_format", item: 1 }]],
    ["an answer that isn't text", question({ answers: ["a", 2, "c", "d"] }), [{ code: "item_wrong_format", item: 1 }]],
    ["a correct answer as text", question({ correct: "Saturn" }), [{ code: "item_wrong_format", item: 1 }]],
    ["an empty question", question({ question: "  " }), [{ code: "question_empty", item: 1 }]],
    ["a long question", question({ question: "q".repeat(201) }), [{ code: "question_too_long", item: 1, max: 200 }]],
    ["three answers", question({ answers: ["a", "b", "c"] }), [{ code: "answer_count", item: 1 }]],
    ["an empty answer", question({ answers: ["a", " ", "c", "d"] }), [{ code: "answer_empty", item: 1 }]],
    [
      "a long answer",
      question({ answers: ["a".repeat(41), "b", "c", "d"] }),
      [{ code: "answer_too_long", item: 1, max: 40 }],
    ],
    ["a correct answer out of range", question({ correct: 4 }), [{ code: "correct_invalid", item: 1 }]],
    ["a negative correct answer", question({ correct: -1 }), [{ code: "correct_invalid", item: 1 }]],
    ["a fractional correct answer", question({ correct: 1.5 }), [{ code: "correct_invalid", item: 1 }]],
    ["a long image idea", question({ imageIdea: "i".repeat(61) }), [{ code: "image_idea_too_long", item: 1, max: 60 }]],
  ] as [string, unknown, AiReplyError[]][])("refuses %s", (_, entry, errors) => {
    expect(errorsOf(parseQuiz(quizReply([entry])))).toEqual(inList("questions", errors));
  });

  it("reports every problem with its question number and adds nothing", () => {
    const reply = quizReply([question(), question({ question: "" }), question({ answers: ["a"], correct: 2 })]);
    expect(errorsOf(parseQuiz(reply))).toEqual(
      inList("questions", [
        { code: "question_empty", item: 2 },
        { code: "answer_count", item: 3 },
        { code: "correct_invalid", item: 3 },
      ]),
    );
  });
});

describe("Draw it from an AI reply", () => {
  it("builds a playable game with new ids and default rules", () => {
    expect(expectPlayable(parseWords(JSON.stringify({ words: [" cat ", "Riding a bike"] })))).toEqual([
      {
        id: "game-draw-it",
        type: "draw-it",
        config: {
          drawSeconds: 60,
          words: [
            { id: "id1", text: "cat" },
            { id: "id2", text: "Riding a bike" },
          ],
        },
      },
    ]);
  });

  it("refuses more words than a game can hold", () => {
    const words = Array.from({ length: 11 }, (_, index) => `word ${index}`);
    expect(errorsOf(parseWords(JSON.stringify({ words })))).toEqual([
      { code: "too_many_items", list: "words", max: 10 },
    ]);
  });

  it.each([
    ["a word that isn't text", { word: "cat" }, { code: "item_wrong_format", item: 2 }],
    ["an empty word", " ", { code: "word_empty", item: 2 }],
    ["a long word", "w".repeat(41), { code: "word_too_long", item: 2, max: 40 }],
  ] as [string, unknown, AiReplyError][])("refuses %s", (_, word, error) => {
    expect(errorsOf(parseWords(JSON.stringify({ words: ["cat", word] })))).toEqual(inList("words", [error]));
  });
});

describe("a quiz and Draw it from one reply", () => {
  const both: GameType[] = ["pop-quiz", "draw-it"];

  it("builds both games in order", () => {
    const games = expectPlayable(parse(JSON.stringify({ questions: [question()], words: ["Rocket"] }), both));
    expect(games.map((game) => [game.id, game.type])).toEqual([
      ["game-pop-quiz", "pop-quiz"],
      ["game-draw-it", "draw-it"],
    ]);
  });

  it("reports problems in both lists and adds nothing", () => {
    const reply = JSON.stringify({ questions: [question({ question: "" })], words: ["Rocket", ""] });
    expect(errorsOf(parse(reply, both))).toEqual([
      { code: "question_empty", item: 1, list: "questions" },
      { code: "word_empty", item: 2, list: "words" },
    ]);
  });

  it("refuses a reply that only has one of the lists", () => {
    expect(errorsOf(parse(quizReply([question()]), both))).toEqual([{ code: "no_items", list: "words" }]);
  });

  it("ignores a list that wasn't asked for", () => {
    const games = expectPlayable(parseQuiz(JSON.stringify({ questions: [question()], words: [""] })));
    expect(games).toHaveLength(1);
  });
});

describe("AI prompts", () => {
  const promptOptions = { topic: "Space", difficulty: "hard" as const, language: "Portuguese", withImageIdeas: true };

  const exampleOf = (prompt: string) => JSON.parse(prompt.slice(prompt.lastIndexOf("\n") + 1));

  it("states the topic, count, difficulty, language and limits for a quiz", () => {
    const prompt = aiPrompt([{ type: "pop-quiz", count: 12 }], promptOptions);
    for (const part of ["Topic: Space", "write 12 questions", "Difficulty: hard", "in Portuguese", "200", "40"]) {
      expect(prompt).toContain(part);
    }
    expect(prompt).toContain("imageIdea");
    expect(prompt).not.toContain("Draw it");
    expect(Object.keys(exampleOf(prompt))).toEqual(["questions"]);
  });

  it("only asks for image ideas when images are on", () => {
    expect(aiPrompt([{ type: "pop-quiz", count: 5 }], { ...promptOptions, withImageIdeas: false })).not.toContain(
      "imageIdea",
    );
  });

  it("states the topic, count and limit for Draw it", () => {
    const prompt = aiPrompt([{ type: "draw-it", count: 7 }], promptOptions);
    for (const part of ["Topic: Space", "write 7 words", "Difficulty: hard", "in Portuguese", "40"]) {
      expect(prompt).toContain(part);
    }
    expect(prompt).not.toContain("Quiz:");
    expect(Object.keys(exampleOf(prompt))).toEqual(["words"]);
  });

  it("asks for both games in one prompt with one reply format", () => {
    const prompt = aiPrompt(
      [
        { type: "pop-quiz", count: 10 },
        { type: "draw-it", count: 5 },
      ],
      promptOptions,
    );
    expect(prompt).toContain("write 10 questions");
    expect(prompt).toContain("write 5 words");
    expect(Object.keys(exampleOf(prompt))).toEqual(["questions", "words"]);
  });
});

describe("image hints", () => {
  const setupWithHint = (imageHint: string) => {
    const game = firstQuiz(parseQuiz(quizReply([question()])));
    const [first] = game.config.questions;
    if (!first) throw new Error("expected a question");
    return { name: "", games: [{ ...game, config: { ...game.config, questions: [{ ...first, imageHint }] } }] };
  };

  it("accepts a hint of up to 60 characters", () => {
    const setup = setupWithHint("h".repeat(60));
    expect(Value.Check(SessionSetupSchema, setup)).toBe(true);
    expect(isSetupValid(setup)).toBe(true);
  });

  it.each([
    ["an empty hint", ""],
    ["a long hint", "h".repeat(61)],
  ])("rejects %s in the schema", (_, hint) => {
    expect(Value.Check(SessionSetupSchema, setupWithHint(hint))).toBe(false);
  });

  it("rejects a hint with hidden characters", () => {
    expect(isSetupValid(setupWithHint("cat​"))).toBe(false);
  });
});
