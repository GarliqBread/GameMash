import type { PlayerCredentials } from "../../lib/credentials";
import { joinSession, lookupRoom } from "../../lib/sessions";

type JoinRequest = {
  roomCode: string;
  name: string;
};

export const joinRoom = async ({ roomCode, name }: JoinRequest): Promise<PlayerCredentials> => {
  const room = await lookupRoom(roomCode);
  const player = await joinSession(room.sessionId, name);
  return {
    role: "player",
    sessionId: room.sessionId,
    playerId: player.playerId,
    playerToken: player.playerToken,
    name,
  };
};
