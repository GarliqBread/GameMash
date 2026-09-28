import { type Static, Type } from "typebox";
import { ItemIdSchema, PopQuizConfigSchema } from "./pop-quiz/schema.js";
import { MAX_GAMES, SESSION_NAME_MAX_LENGTH } from "./setup.js";

export const GameSetupSchema = Type.Object(
  {
    id: ItemIdSchema,
    type: Type.Literal("pop-quiz"),
    config: PopQuizConfigSchema,
  },
  { additionalProperties: false },
);
export type GameSetup = Static<typeof GameSetupSchema>;

export const SessionSetupSchema = Type.Object(
  {
    name: Type.String({ maxLength: SESSION_NAME_MAX_LENGTH }),
    games: Type.Array(GameSetupSchema, { maxItems: MAX_GAMES }),
  },
  { additionalProperties: false },
);
export type SessionSetup = Static<typeof SessionSetupSchema>;
