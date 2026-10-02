import { type AiPart, type AiReplyResult, cleanText, collect, failed } from "../ai-reply.js";
import { DRAW_IT_MAX_WORDS, DRAW_IT_WORD_MAX_LENGTH, defaultDrawItConfig } from "./config.js";
import type { DrawItConfig, DrawItWord } from "./schema.js";

const readWord = (value: unknown, item: number, id: string): AiReplyResult<DrawItWord> => {
  if (typeof value !== "string") return failed([{ code: "item_wrong_format", item }]);
  const text = cleanText(value);
  if (text.length === 0) return failed([{ code: "word_empty", item }]);
  if (text.length > DRAW_IT_WORD_MAX_LENGTH) {
    return failed([{ code: "word_too_long", item, max: DRAW_IT_WORD_MAX_LENGTH }]);
  }
  return { ok: true, value: { id, text } };
};

export const drawItAi: AiPart<DrawItConfig> = {
  list: "words",
  defaultCount: 5,
  maxCount: DRAW_IT_MAX_WORDS,
  task: (count) =>
    `Draw it: write ${count} words. Everyone draws the same word on their phone, then rates each other's drawings.`,
  rules: () => [
    `- Each entry is a word or short phrase of at most ${DRAW_IT_WORD_MAX_LENGTH} characters.`,
    "- Everything must be possible to draw in under a minute and easy to recognise. Easy means simple objects; hard means actions, scenes or ideas.",
    "- No repeated words.",
  ],
  example: () => '["...", "..."]',
  parse: (items, newId) => {
    const words = collect(items.map((value, index) => readWord(value, index + 1, newId())));
    return words.ok ? { ok: true, value: { ...defaultDrawItConfig(""), words: words.value } } : words;
  },
};
