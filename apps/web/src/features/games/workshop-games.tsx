import {
  defaultDrawItConfig,
  defaultPopQuizConfig,
  type GameSetup,
  type GameType,
  isQuestionComplete,
  type SessionSetup,
} from "@gamemash/games/config";
import type { ComponentType } from "react";
import { createLocalId } from "../../lib/ids";
import { DrawItEditor } from "../setup/DrawItEditor";
import { DrawItRules } from "../setup/DrawItRules";
import { QuizEditor } from "../setup/QuizEditor";
import { QuizRules } from "../setup/QuizRules";
import {
  type ConfigOf,
  type GameOf,
  newQuestionId,
  newWordId,
  updateDrawItConfig,
  updateQuizConfig,
} from "../setup/setup-changes";
import type { ImageUploads } from "../setup/useImageUploads";

type ConfigChange<Config> = (change: (config: Config) => Config) => void;

type GameSettingsProps<Config> = {
  config: Config;
  onChange: ConfigChange<Config>;
};

type GameEditorProps<Config> = GameSettingsProps<Config> & {
  selectedItemId: string | undefined;
  onSelectItem: (id: string) => void;
  uploads: ImageUploads;
  imagesEnabled: boolean;
};

type WorkshopGame<Type extends GameType> = {
  Editor: ComponentType<GameEditorProps<ConfigOf<Type>>>;
  Settings: ComponentType<GameSettingsProps<ConfigOf<Type>>>;
  newGame: () => GameOf<Type>;
  editTitleId: string;
  unreadyMessageId: string;
  firstIncompleteItemId: (config: ConfigOf<Type>) => string | undefined;
  updateConfig: (
    setup: SessionSetup,
    gameId: string,
    change: (config: ConfigOf<Type>) => ConfigOf<Type>,
  ) => SessionSetup;
};

const WORKSHOP_GAMES: { [Type in GameType]: WorkshopGame<Type> } = {
  "pop-quiz": {
    Editor: QuizEditor,
    Settings: QuizRules,
    newGame: () => ({ id: createLocalId("quiz"), type: "pop-quiz", config: defaultPopQuizConfig(newQuestionId()) }),
    editTitleId: "setup.editQuestions",
    unreadyMessageId: "setup.needComplete",
    firstIncompleteItemId: (config) => config.questions.find((question) => !isQuestionComplete(question))?.id,
    updateConfig: updateQuizConfig,
  },
  "draw-it": {
    Editor: DrawItEditor,
    Settings: DrawItRules,
    newGame: () => ({ id: createLocalId("draw"), type: "draw-it", config: defaultDrawItConfig(newWordId()) }),
    editTitleId: "setup.editWords",
    unreadyMessageId: "setup.needWords",
    firstIncompleteItemId: () => undefined,
    updateConfig: updateDrawItConfig,
  },
};

const workshopGameOf = <Type extends GameType>(game: GameOf<Type>): WorkshopGame<Type> => WORKSHOP_GAMES[game.type];

export const newGame = (type: GameType): GameSetup => WORKSHOP_GAMES[type].newGame();

export const editTitleIdOf = (game: GameSetup) => WORKSHOP_GAMES[game.type].editTitleId;

export const unreadyMessageIdOf = (game: GameSetup) => WORKSHOP_GAMES[game.type].unreadyMessageId;

export const firstIncompleteItemIdOf = <Type extends GameType>(game: GameOf<Type>) =>
  workshopGameOf(game).firstIncompleteItemId(game.config);

type SetupUpdate = (change: (current: SessionSetup) => SessionSetup) => void;

type GameEditorSlotProps<Type extends GameType> = Omit<GameEditorProps<unknown>, "config" | "onChange"> & {
  game: GameOf<Type>;
  update: SetupUpdate;
};

export const GameEditor = <Type extends GameType>({ game, update, ...props }: GameEditorSlotProps<Type>) => {
  const { Editor, updateConfig } = workshopGameOf(game);
  return (
    <Editor
      config={game.config}
      onChange={(change) => update((current) => updateConfig(current, game.id, change))}
      {...props}
    />
  );
};

type GameSettingsSlotProps<Type extends GameType> = {
  game: GameOf<Type>;
  update: SetupUpdate;
};

export const GameSettings = <Type extends GameType>({ game, update }: GameSettingsSlotProps<Type>) => {
  const { Settings, updateConfig } = workshopGameOf(game);
  return (
    <Settings config={game.config} onChange={(change) => update((current) => updateConfig(current, game.id, change))} />
  );
};
