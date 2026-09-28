import { uploadAvatar } from "../../lib/avatar";
import type { PlayerCredentials } from "../../lib/credentials";
import { joinSession, lookupRoom } from "../../lib/sessions";

type JoinRequest = {
  roomCode: string;
  name: string;
  avatar: Blob | null;
};

type JoinResult = {
  credentials: PlayerCredentials;
  isPhotoFailed: boolean;
};

const tryUpload = async (credentials: PlayerCredentials, avatar: Blob) => {
  try {
    await uploadAvatar(credentials.sessionId, credentials.playerId, credentials.playerToken, avatar);
    return true;
  } catch {
    return false;
  }
};

export const joinWithPhoto = async ({ roomCode, name, avatar }: JoinRequest): Promise<JoinResult> => {
  const room = await lookupRoom(roomCode);
  const player = await joinSession(room.sessionId, name);
  const credentials: PlayerCredentials = {
    role: "player",
    sessionId: room.sessionId,
    playerId: player.playerId,
    playerToken: player.playerToken,
    name,
  };
  const isPhotoFailed = avatar ? !(await tryUpload(credentials, avatar)) : false;
  return { credentials, isPhotoFailed };
};
