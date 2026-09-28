import type { LobbyPlayer } from "@gamemash/shared";
import { useMemo } from "react";
import { useLobbyStore } from "../../lib/lobby";

const NO_PLAYERS: LobbyPlayer[] = [];

export const usePlayers = () => {
  const players = useLobbyStore((store) => store.state?.players ?? NO_PLAYERS);
  return useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
};
