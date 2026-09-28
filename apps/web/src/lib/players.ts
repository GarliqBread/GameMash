import { avatarPath, type LobbyPlayer } from "@gamemash/shared";

export const avatarSrc = (sessionId: string, player: LobbyPlayer) =>
  player.avatarVersion === null ? undefined : avatarPath(sessionId, player.id, player.avatarVersion);
