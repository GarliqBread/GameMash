import { avatarPath, type LobbyPlayer } from "@gamemash/shared";
import { characterSrc } from "./character";

export const avatarSrc = (sessionId: string, player: LobbyPlayer) =>
  player.avatarVersion === null
    ? characterSrc(player.character)
    : avatarPath(sessionId, player.id, player.avatarVersion);
