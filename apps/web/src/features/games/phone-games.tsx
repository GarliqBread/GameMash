import type { GameType } from "@gamemash/games/config";
import type { ComponentType } from "react";
import { PhoneDrawIt } from "../draw/PhoneDrawIt";
import { PhoneQuiz } from "../quiz/PhoneQuiz";
import type { GameView, PhoneGameProps, PlayingGame } from "./game-views";

type PhoneComponent<Type extends GameType> = ComponentType<PhoneGameProps<GameView<Type, "player">>>;

const PHONE_GAMES: { [Type in GameType]: PhoneComponent<Type> } = {
  "pop-quiz": PhoneQuiz,
  "draw-it": PhoneDrawIt,
};

type GamePhoneProps<Type extends GameType> = Omit<PhoneGameProps<unknown>, "view"> & {
  game: PlayingGame<"player", Type>;
};

export const GamePhone = <Type extends GameType>({ game, ...props }: GamePhoneProps<Type>) => {
  const Phone: PhoneComponent<Type> = PHONE_GAMES[game.type];
  return <Phone view={game.view} {...props} />;
};
