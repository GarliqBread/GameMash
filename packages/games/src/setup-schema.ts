import { type Static, Type } from "typebox";
import { DrawItConfigSchema } from "./draw-it/schema.js";
import { ItemIdSchema } from "./item-id.js";
import { PopQuizConfigSchema } from "./pop-quiz/schema.js";
import { MAX_GAMES, SESSION_NAME_MAX_LENGTH, SETUP_FILE_FORMAT, SETUP_FILE_VERSION } from "./setup.js";

const PopQuizSetupSchema = Type.Object(
  {
    id: ItemIdSchema,
    type: Type.Literal("pop-quiz"),
    config: PopQuizConfigSchema,
  },
  { additionalProperties: false },
);

const DrawItSetupSchema = Type.Object(
  {
    id: ItemIdSchema,
    type: Type.Literal("draw-it"),
    config: DrawItConfigSchema,
  },
  { additionalProperties: false },
);

const GameSetupSchema = Type.Union([PopQuizSetupSchema, DrawItSetupSchema]);
export type GameSetup = Static<typeof GameSetupSchema>;

export const SessionSetupSchema = Type.Object(
  {
    name: Type.String({ maxLength: SESSION_NAME_MAX_LENGTH }),
    games: Type.Array(GameSetupSchema, { maxItems: MAX_GAMES }),
  },
  { additionalProperties: false },
);
export type SessionSetup = Static<typeof SessionSetupSchema>;

export const CreateSessionBodySchema = Type.Object(
  {
    name: Type.Optional(Type.String({ maxLength: SESSION_NAME_MAX_LENGTH })),
  },
  { additionalProperties: false },
);

export const HostSetupResponseSchema = Type.Object(
  {
    setup: SessionSetupSchema,
    imagesEnabled: Type.Boolean(),
  },
  { additionalProperties: false },
);
export type HostSetupResponse = Static<typeof HostSetupResponseSchema>;

export const SetupFileSchema = Type.Object(
  {
    format: Type.Literal(SETUP_FILE_FORMAT),
    version: Type.Literal(SETUP_FILE_VERSION),
    setup: SessionSetupSchema,
  },
  { additionalProperties: false },
);
export type SetupFile = Static<typeof SetupFileSchema>;

export const SetupImportResponseSchema = Type.Object(
  { setup: SessionSetupSchema, addedGames: Type.Integer({ minimum: 0 }) },
  { additionalProperties: false },
);
export type SetupImportResponse = Static<typeof SetupImportResponseSchema>;
