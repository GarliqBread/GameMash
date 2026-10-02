import {
  type AiPart,
  type AiPromptOptions,
  type AiReplyResult,
  collect,
  failed,
  isRecord,
  promptLines,
  readReplyJson,
} from "./ai-reply.js";
import { drawItAi } from "./draw-it/ai.js";
import { popQuizAi } from "./pop-quiz/ai.js";
import type { GameType } from "./setup.js";
import type { GameSetup } from "./setup-schema.js";

export type {
  AiDifficulty,
  AiList,
  AiPromptOptions,
  AiReplyError,
  AiReplyErrorCode,
  AiReplyResult,
} from "./ai-reply.js";
export { AI_DIFFICULTIES, AI_REPLY_MAX_LENGTH, AI_TOPIC_MAX_LENGTH } from "./ai-reply.js";

export type AiGameRequest = { type: GameType; count: number };

export type AiNewIds = { newGameId: () => string; newItemId: () => string };

export type AiParseOptions = {
  idsOf: (type: GameType) => AiNewIds;
  withImageIdeas: boolean;
};

type AiGame = Omit<AiPart<unknown>, "parse"> & {
  build: (items: unknown[], ids: AiNewIds, withImageIdeas: boolean) => AiReplyResult<GameSetup>;
};

const aiGameOf = <Config>(part: AiPart<Config>, toGame: (id: string, config: Config) => GameSetup): AiGame => ({
  ...part,
  build: (items, { newGameId, newItemId }, withImageIdeas) => {
    const result = part.parse(items, newItemId, withImageIdeas);
    return result.ok ? { ok: true, value: toGame(newGameId(), result.value) } : result;
  },
});

const AI_GAMES: Record<GameType, AiGame> = {
  "pop-quiz": aiGameOf(popQuizAi, (id, config) => ({ id, type: "pop-quiz", config })),
  "draw-it": aiGameOf(drawItAi, (id, config) => ({ id, type: "draw-it", config })),
};

export const aiCounts = (type: GameType) => {
  const { defaultCount, maxCount, list } = AI_GAMES[type];
  return { defaultCount, maxCount, list };
};

export const aiPrompt = (requests: AiGameRequest[], options: AiPromptOptions) => {
  const games = requests.map((request) => ({ ...request, game: AI_GAMES[request.type] }));
  const example = games.map(({ game }) => `"${game.list}": ${game.example(options)}`).join(", ");
  return promptLines([
    "Write content for GameMash, a party game played on a big screen, with everyone using their phone.",
    "",
    `Topic: ${options.topic}`,
    `Difficulty: ${options.difficulty}`,
    `Language: write everything in ${options.language}.`,
    ...games.flatMap(({ game, count }) => ["", game.task(count), ...game.rules(options)]),
    "",
    "Reply with only this JSON in one code block:",
    `{${example}}`,
  ]);
};

const readGame = (game: AiGame, items: unknown, ids: AiNewIds, withImageIdeas: boolean) => {
  const { list, maxCount } = game;
  if (items === undefined) return failed<GameSetup>([{ code: "no_items", list }]);
  if (!Array.isArray(items)) return failed<GameSetup>([{ code: "wrong_format", list }]);
  if (items.length === 0) return failed<GameSetup>([{ code: "no_items", list }]);
  if (items.length > maxCount) return failed<GameSetup>([{ code: "too_many_items", list, max: maxCount }]);
  const result = game.build(items, ids, withImageIdeas);
  return result.ok ? result : failed<GameSetup>(result.errors.map((error) => ({ ...error, list })));
};

export const parseAiReply = (
  reply: string,
  types: GameType[],
  { idsOf, withImageIdeas }: AiParseOptions,
): AiReplyResult<GameSetup[]> => {
  const json = readReplyJson(reply);
  if (json === undefined) return failed([{ code: "not_json" }]);
  if (!isRecord(json)) return failed([{ code: "wrong_format" }]);
  return collect(types.map((type) => readGame(AI_GAMES[type], json[AI_GAMES[type].list], idsOf(type), withImageIdeas)));
};
