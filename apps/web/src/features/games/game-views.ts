import { isGameId } from "@gamemash/games";
import type {
  DrawItPlayerView,
  DrawItStageView,
  GameType,
  QuizPlayerView,
  QuizStageView,
} from "@gamemash/games/config";
import type { LobbyPlayer, PlayingSnapshot } from "@gamemash/shared";
import type { PlayerCredentials } from "../../lib/credentials";
import type { LobbyStatus } from "../../lib/lobby";
import type { PlayerIdentity } from "../play/PlayFrame";

type GameViews = {
  "pop-quiz": { stage: QuizStageView; player: QuizPlayerView };
  "draw-it": { stage: DrawItStageView; player: DrawItPlayerView };
};

type Audience = "stage" | "player";

export type GameView<Type extends GameType, Viewer extends Audience> = GameViews[Type][Viewer];

export type PlayingGame<Viewer extends Audience, Type extends GameType = GameType> = {
  [Key in Type]: { type: Key; view: GameView<Key, Viewer> };
}[Type];

const playingGameOf = <Viewer extends Audience>(snapshot: PlayingSnapshot) =>
  isGameId(snapshot.gameType) ? ({ type: snapshot.gameType, view: snapshot.view } as PlayingGame<Viewer>) : null;

export const stageGameOf = (snapshot: PlayingSnapshot) => playingGameOf<"stage">(snapshot);

export const playerGameOf = (snapshot: PlayingSnapshot) => playingGameOf<"player">(snapshot);

export type StageGameProps<View> = {
  snapshot: PlayingSnapshot;
  view: View;
  players: Map<string, LobbyPlayer>;
  status: LobbyStatus;
};

export type PhoneGameProps<View> = {
  credentials: PlayerCredentials;
  me: PlayerIdentity;
  snapshot: PlayingSnapshot;
  view: View;
  status: LobbyStatus;
};
