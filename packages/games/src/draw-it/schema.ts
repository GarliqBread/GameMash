import { BRUSH_SIZES, DRAW_COLORS, ERASER, FILL, MIN_RING_POINTS } from "@gamemash/shared";
import { type Static, Type } from "typebox";
import { ItemIdSchema } from "../item-id.js";
import {
  DRAW_IT_DRAW_SECONDS,
  DRAW_IT_MAX_FILL_RINGS,
  DRAW_IT_MAX_POINTS,
  DRAW_IT_MAX_STROKES,
  DRAW_IT_MAX_WORDS,
  DRAW_IT_WORD_MAX_LENGTH,
} from "./config.js";

export const DrawItWordSchema = Type.Object(
  {
    id: ItemIdSchema,
    text: Type.String({ maxLength: DRAW_IT_WORD_MAX_LENGTH }),
  },
  { additionalProperties: false },
);
export type DrawItWord = Static<typeof DrawItWordSchema>;

export const DrawItConfigSchema = Type.Object(
  {
    words: Type.Array(DrawItWordSchema, { maxItems: DRAW_IT_MAX_WORDS }),
    drawSeconds: Type.Enum(DRAW_IT_DRAW_SECONDS),
  },
  { additionalProperties: false },
);
export type DrawItConfig = Static<typeof DrawItConfigSchema>;

const UnitSchema = Type.Number({ minimum: 0, maximum: 1 });

export const StrokeSchema = Type.Object(
  {
    color: Type.Union([Type.Enum(DRAW_COLORS), Type.Literal(ERASER)]),
    size: Type.Enum(BRUSH_SIZES),
    points: Type.Array(Type.Tuple([UnitSchema, UnitSchema, UnitSchema]), { minItems: 1, maxItems: DRAW_IT_MAX_POINTS }),
  },
  { additionalProperties: false },
);
export const FillSchema = Type.Object(
  {
    kind: Type.Literal(FILL),
    color: Type.Enum(DRAW_COLORS),
    rings: Type.Array(
      Type.Array(Type.Tuple([UnitSchema, UnitSchema]), { minItems: MIN_RING_POINTS, maxItems: DRAW_IT_MAX_POINTS }),
      { minItems: 1, maxItems: DRAW_IT_MAX_FILL_RINGS },
    ),
  },
  { additionalProperties: false },
);
export const DrawingSchema = Type.Object(
  { strokes: Type.Array(Type.Union([StrokeSchema, FillSchema]), { maxItems: DRAW_IT_MAX_STROKES }) },
  { additionalProperties: false },
);
export const DrawingUploadSchema = Type.Object(
  { done: Type.Boolean(), drawing: DrawingSchema },
  { additionalProperties: false },
);
export type DrawingUpload = Static<typeof DrawingUploadSchema>;
