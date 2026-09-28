import { type Static, Type } from "typebox";
import { ERROR_CODES } from "./errors.js";

export const ApiErrorSchema = Type.Object({
  code: Type.Enum([...ERROR_CODES]),
  params: Type.Optional(Type.Record(Type.String(), Type.Union([Type.String(), Type.Number()]))),
});

export const SessionStatusSchema = Type.Union([
  Type.Literal("lobby"),
  Type.Literal("playing"),
  Type.Literal("finished"),
]);
export type SessionStatus = Static<typeof SessionStatusSchema>;

export const CreateSessionResponseSchema = Type.Object({
  sessionId: Type.String(),
  roomCode: Type.String(),
  hostToken: Type.String(),
});
export type CreateSessionResponse = Static<typeof CreateSessionResponseSchema>;

export const RoomLookupParamsSchema = Type.Object({
  code: Type.String({ minLength: 1, maxLength: 16 }),
});
export type RoomLookupParams = Static<typeof RoomLookupParamsSchema>;

export const RoomLookupResponseSchema = Type.Object({
  sessionId: Type.String(),
  status: SessionStatusSchema,
});
export type RoomLookupResponse = Static<typeof RoomLookupResponseSchema>;

export const PlayerParamsSchema = Type.Object({
  sessionId: Type.String({ format: "uuid" }),
  playerId: Type.String({ format: "uuid" }),
});
export type PlayerParams = Static<typeof PlayerParamsSchema>;

export const BearerAuthHeadersSchema = Type.Object({
  authorization: Type.Optional(Type.String({ maxLength: 256 })),
});

export const SessionParamsSchema = Type.Object({
  sessionId: Type.String({ format: "uuid" }),
});
export type SessionParams = Static<typeof SessionParamsSchema>;

export const JoinSessionBodySchema = Type.Object({
  name: Type.String({ maxLength: 256 }),
});
export type JoinSessionBody = Static<typeof JoinSessionBodySchema>;

export const JoinSessionResponseSchema = Type.Object({
  playerId: Type.String(),
  playerToken: Type.String(),
});
export type JoinSessionResponse = Static<typeof JoinSessionResponseSchema>;

const PhaseIdSchema = Type.Integer({ minimum: 1 });

export const GameNextPayloadSchema = Type.Object({ phaseId: PhaseIdSchema }, { additionalProperties: false });
export type GameNextPayload = Static<typeof GameNextPayloadSchema>;

export const GameInputPayloadSchema = Type.Object(
  { phaseId: PhaseIdSchema, input: Type.Unknown() },
  { additionalProperties: false },
);
export type GameInputPayload = Static<typeof GameInputPayloadSchema>;

export const HandshakeAuthSchema = Type.Union([
  Type.Object({
    role: Type.Literal("host"),
    sessionId: Type.String({ format: "uuid" }),
    hostToken: Type.String({ maxLength: 128 }),
  }),
  Type.Object({
    role: Type.Literal("player"),
    sessionId: Type.String({ format: "uuid" }),
    playerId: Type.String({ format: "uuid" }),
    playerToken: Type.String({ maxLength: 128 }),
  }),
]);
export type HandshakeAuth = Static<typeof HandshakeAuthSchema>;
