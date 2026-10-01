import type { LobbyPlayer } from "@gamemash/shared";

const VISIBLE_SLOTS = 15;
const WAITING_SLOTS = 3;

type LobbySlot =
  | { kind: "player"; player: LobbyPlayer }
  | { kind: "more"; count: number }
  | { kind: "waiting"; key: string };

const toPlayerSlot = (player: LobbyPlayer): LobbySlot => ({ kind: "player", player });

export const lobbySlots = (players: LobbyPlayer[]): LobbySlot[] => {
  const ordered = [...players].sort((a, b) => a.joinedAt - b.joinedAt);
  if (ordered.length > VISIBLE_SLOTS) {
    const shown = ordered.slice(-(VISIBLE_SLOTS - 1));
    return [...shown.map(toPlayerSlot), { kind: "more", count: ordered.length - shown.length }];
  }
  const waiting = Math.min(WAITING_SLOTS, VISIBLE_SLOTS - ordered.length);
  return [
    ...ordered.map(toPlayerSlot),
    ...Array.from({ length: waiting }, (_, index): LobbySlot => ({ kind: "waiting", key: `waiting-${index}` })),
  ];
};
