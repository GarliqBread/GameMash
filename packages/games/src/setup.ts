import type { LineupEntry } from "@gamemash/shared";
import { drawItConfigRules } from "./draw-it/config.js";
import type { GameConfigRules } from "./game-config.js";
import { popQuizConfigRules } from "./pop-quiz/config.js";
import type { GameSetup, SessionSetup } from "./setup-schema.js";
import { hasUniqueIds } from "./unique.js";

export type { GameConfigRules } from "./game-config.js";
export type { GameSetup, HostSetupResponse, SessionSetup } from "./setup-schema.js";

export const SESSION_NAME_MAX_LENGTH = 40;
export const MAX_GAMES = 10;

export type GameType = GameSetup["type"];
type ConfigOf<Type extends GameType> = Extract<GameSetup, { type: Type }>["config"];

const CONFIG_RULES: { [Type in GameType]: GameConfigRules<ConfigOf<Type>> } = {
  "pop-quiz": popQuizConfigRules,
  "draw-it": drawItConfigRules,
};

const configRulesOf = <Game extends GameSetup>(game: Game) =>
  CONFIG_RULES[game.type] as GameConfigRules<Game["config"]>;

export const emptySetup = (): SessionSetup => ({ name: "", games: [] });

export const isSetupValid = (setup: SessionSetup) =>
  hasUniqueIds(setup.games) && setup.games.every((game) => configRulesOf(game).isValid(game.config));

export const setupImageIds = (setup: SessionSetup) => [
  ...new Set(setup.games.flatMap((game) => configRulesOf(game).imageIds(game.config))),
];

const gameWithoutImages = <Game extends GameSetup>(game: Game): Game => ({
  ...game,
  config: configRulesOf(game).withoutImages(game.config),
});

export const withoutImages = (setup: SessionSetup): SessionSetup => ({
  ...setup,
  games: setup.games.map(gameWithoutImages),
});

export const isGameReady = (game: GameSetup) => configRulesOf(game).isReady(game.config);

export const isSetupReady = (setup: SessionSetup) => setup.games.length > 0 && setup.games.every(isGameReady);

export const summarizeGame = (game: GameSetup): LineupEntry => {
  const rules = configRulesOf(game);
  return {
    id: game.id,
    type: game.type,
    roundCount: rules.roundCount(game.config),
    roundSeconds: rules.roundSeconds(game.config),
  };
};
