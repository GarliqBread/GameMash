import { isGameReady, type SessionSetup } from "@gamemash/games/config";
import { firstIncompleteItemIdOf, unreadyMessageIdOf } from "../games/workshop-games";

export const firstUnready = (setup: SessionSetup) => {
  const game = setup.games.find((item) => !isGameReady(item));
  return game ? { game, itemId: firstIncompleteItemIdOf(game) } : null;
};

export const setupProblemId = (setup: SessionSetup) => {
  const unready = firstUnready(setup);
  if (unready) return unreadyMessageIdOf(unready.game);
  return setup.games.length === 0 ? "setup.needGame" : null;
};
