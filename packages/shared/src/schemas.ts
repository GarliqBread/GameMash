import { type Static, Type } from "typebox";
import { CHARACTER_PART_COUNTS } from "./character.js";
import { ERROR_CODES } from "./errors.js";

const RAW_ROOM_CODE_MAX_LENGTH = 16;
const RAW_AUTHORIZATION_MAX_LENGTH = 256;
const RAW_NAME_MAX_LENGTH = 256;
const RAW_TOKEN_MAX_LENGTH = 128;

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
  code: Type.String({ minLength: 1, maxLength: RAW_ROOM_CODE_MAX_LENGTH }),
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
  authorization: Type.Optional(Type.String({ maxLength: RAW_AUTHORIZATION_MAX_LENGTH })),
});

export const SessionParamsSchema = Type.Object({
  sessionId: Type.String({ format: "uuid" }),
});
export type SessionParams = Static<typeof SessionParamsSchema>;

const partSchema = (count: number) => Type.Integer({ minimum: 0, maximum: count - 1 });

export const CharacterSchema = Type.Object(
  {
    head: partSchema(CHARACTER_PART_COUNTS.head),
    eyes: partSchema(CHARACTER_PART_COUNTS.eyes),
    nose: partSchema(CHARACTER_PART_COUNTS.nose),
    mouth: partSchema(CHARACTER_PART_COUNTS.mouth),
    top: partSchema(CHARACTER_PART_COUNTS.top),
    topColor: partSchema(CHARACTER_PART_COUNTS.topColor),
    beard: Type.Union([partSchema(CHARACTER_PART_COUNTS.beard), Type.Null()]),
    mustache: Type.Union([partSchema(CHARACTER_PART_COUNTS.mustache), Type.Null()]),
  },
  { additionalProperties: false },
);
export type Character = Static<typeof CharacterSchema>;

export const JoinSessionBodySchema = Type.Object({
  name: Type.String({ maxLength: RAW_NAME_MAX_LENGTH }),
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

export const KickPlayerPayloadSchema = Type.Object(
  { playerId: Type.String({ format: "uuid" }) },
  { additionalProperties: false },
);
export type KickPlayerPayload = Static<typeof KickPlayerPayloadSchema>;

export const HandshakeAuthSchema = Type.Union([
  Type.Object({
    role: Type.Literal("host"),
    sessionId: Type.String({ format: "uuid" }),
    hostToken: Type.String({ maxLength: RAW_TOKEN_MAX_LENGTH }),
  }),
  Type.Object({
    role: Type.Literal("player"),
    sessionId: Type.String({ format: "uuid" }),
    playerId: Type.String({ format: "uuid" }),
    playerToken: Type.String({ maxLength: RAW_TOKEN_MAX_LENGTH }),
  }),
]);
export type HandshakeAuth = Static<typeof HandshakeAuthSchema>;
