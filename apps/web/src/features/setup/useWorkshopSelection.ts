import type { SessionSetup } from "@gamemash/games/config";
import { useState } from "react";

export const useWorkshopSelection = (setup: SessionSetup) => {
  const [selectedGameId, setSelectedGameId] = useState(setup.games[0]?.id);
  const [selectedItems, setSelectedItems] = useState<Record<string, string>>({});

  const game = setup.games.find((item) => item.id === selectedGameId) ?? setup.games[0];
  const selectItem = (gameId: string, itemId: string) =>
    setSelectedItems((current) => ({ ...current, [gameId]: itemId }));

  return {
    game,
    selectedItemId: game ? selectedItems[game.id] : undefined,
    selectGame: setSelectedGameId,
    selectItem,
  };
};
