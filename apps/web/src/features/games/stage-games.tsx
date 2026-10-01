import type { GameType } from "@gamemash/games/config";
import type { ComponentType } from "react";
import { StageDrawIt } from "../draw/StageDrawIt";
import { StageQuiz } from "../quiz/StageQuiz";
import type { GameView, PlayingGame, StageGameProps } from "./game-views";

type StageComponent<Type extends GameType> = ComponentType<StageGameProps<GameView<Type, "stage">>>;

const STAGE_GAMES: { [Type in GameType]: StageComponent<Type> } = {
  "pop-quiz": StageQuiz,
  "draw-it": StageDrawIt,
};

type GameStageProps<Type extends GameType> = Omit<StageGameProps<unknown>, "view"> & {
  game: PlayingGame<"stage", Type>;
};

export const GameStage = <Type extends GameType>({ game, ...props }: GameStageProps<Type>) => {
  const Stage: StageComponent<Type> = STAGE_GAMES[game.type];
  return <Stage view={game.view} {...props} />;
};
