import type { PlayerCredentials } from "./credentials";

export const sessionSetupKey = (sessionId: string) => ["session-setup", sessionId];

export const sessionImagesKey = (sessionId: string) => ["session-images", sessionId];

export const playerDrawingKey = ({ sessionId, playerId }: PlayerCredentials, phaseId: number, drawingId: string) => [
  "drawing",
  sessionId,
  playerId,
  phaseId,
  drawingId,
];

export const hostDrawingKey = (sessionId: string, roundKey: string, drawingId: string) => [
  "drawing",
  sessionId,
  "host",
  roundKey,
  drawingId,
];
