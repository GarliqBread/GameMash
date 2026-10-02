import { stripHiddenCharacters } from "@gamemash/shared";

export type AiDifficulty = "easy" | "medium" | "hard";
export const AI_DIFFICULTIES: AiDifficulty[] = ["easy", "medium", "hard"];
export const AI_TOPIC_MAX_LENGTH = 200;
export const AI_REPLY_MAX_LENGTH = 100_000;

export type AiPromptOptions = {
  topic: string;
  difficulty: AiDifficulty;
  language: string;
  withImageIdeas: boolean;
};

export type AiList = "questions" | "words";

export type AiReplyErrorCode =
  | "not_json"
  | "wrong_format"
  | "no_items"
  | "too_many_items"
  | "item_wrong_format"
  | "question_empty"
  | "question_too_long"
  | "answer_count"
  | "answer_empty"
  | "answer_too_long"
  | "correct_invalid"
  | "image_idea_too_long"
  | "word_empty"
  | "word_too_long";

export type AiReplyError = { code: AiReplyErrorCode; list?: AiList; item?: number; max?: number };

export type AiReplyResult<Value> = { ok: true; value: Value } | { ok: false; errors: AiReplyError[] };

export type AiPart<Config> = {
  list: AiList;
  defaultCount: number;
  maxCount: number;
  task: (count: number) => string;
  rules: (options: AiPromptOptions) => (string | false)[];
  example: (options: AiPromptOptions) => string;
  parse: (items: unknown[], newId: () => string, withImageIdeas: boolean) => AiReplyResult<Config>;
};

export const collect = <Item>(results: AiReplyResult<Item>[]): AiReplyResult<Item[]> => {
  const errors = results.flatMap((result) => (result.ok ? [] : result.errors));
  if (errors.length > 0) return failed(errors);
  return { ok: true, value: results.flatMap((result) => (result.ok ? [result.value] : [])) };
};

const CODE_FENCE = /```[a-z]*\s*([\s\S]*?)```/i;

export const readReplyJson = (reply: string): unknown => {
  if (reply.length > AI_REPLY_MAX_LENGTH) return undefined;
  const fenced = CODE_FENCE.exec(reply)?.[1];
  try {
    return JSON.parse((fenced ?? reply).trim());
  } catch {
    return undefined;
  }
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const cleanText = (value: string) => stripHiddenCharacters(value).trim();

export const failed = <Value>(errors: AiReplyError[]): AiReplyResult<Value> => ({ ok: false, errors });

export const promptLines = (lines: (string | false)[]) =>
  lines.filter((line): line is string => line !== false).join("\n");
