import {
  PROOF_PHOTO_MAX_DIMENSION,
  PROOF_PHOTOS_MAX,
  PROOF_VIDEO_MAX_DURATION_MS,
  PROOF_VIDEO_MAX_LONG_SIDE,
} from "@gamemash/shared";
import { type Static, Type } from "typebox";
import { ItemIdSchema } from "../item-id.js";
import {
  POP_QUIZ_ANSWER_MAX_LENGTH,
  POP_QUIZ_IMAGE_HINT_MAX_LENGTH,
  POP_QUIZ_MAX_IMAGES_PER_QUESTION,
  POP_QUIZ_MAX_QUESTIONS,
  POP_QUIZ_POINT_LEVELS,
  POP_QUIZ_PROOF_ALT_MAX_LENGTH,
  POP_QUIZ_PROOF_CAPTION_MAX_LENGTH,
  POP_QUIZ_PROOF_LAYOUTS,
  POP_QUIZ_QUESTION_KINDS,
  POP_QUIZ_QUESTION_MAX_LENGTH,
  POP_QUIZ_TEXT_MAX_RUNS,
  POP_QUIZ_TIME_LIMITS,
  QUIZ_ANSWER_KEYS,
} from "./config.js";

const AnswerTextSchema = Type.String({ maxLength: POP_QUIZ_ANSWER_MAX_LENGTH });

const QuizTextRunSchema = Type.Object(
  {
    text: Type.String({ minLength: 1, maxLength: POP_QUIZ_QUESTION_MAX_LENGTH }),
    bold: Type.Optional(Type.Boolean()),
    italic: Type.Optional(Type.Boolean()),
    underline: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);
export type QuizTextRun = Static<typeof QuizTextRunSchema>;

const QuizTextSchema = Type.Array(QuizTextRunSchema, { maxItems: POP_QUIZ_TEXT_MAX_RUNS });
export type QuizText = Static<typeof QuizTextSchema>;

const ProofDimensionSchema = Type.Integer({ minimum: 1, maximum: PROOF_PHOTO_MAX_DIMENSION });
const ProofCaptionSchema = Type.String({ maxLength: POP_QUIZ_PROOF_CAPTION_MAX_LENGTH });
const ProofLayoutSchema = Type.Enum(POP_QUIZ_PROOF_LAYOUTS);

const QuizProofPhotoSchema = Type.Object(
  {
    assetId: ItemIdSchema,
    alt: Type.String({ maxLength: POP_QUIZ_PROOF_ALT_MAX_LENGTH }),
    width: ProofDimensionSchema,
    height: ProofDimensionSchema,
  },
  { additionalProperties: false },
);
export type QuizProofPhoto = Static<typeof QuizProofPhotoSchema>;

const QuizPhotoProofSchema = Type.Object(
  {
    kind: Type.Literal("image"),
    photos: Type.Array(QuizProofPhotoSchema, { minItems: 1, maxItems: PROOF_PHOTOS_MAX }),
    caption: ProofCaptionSchema,
    layout: ProofLayoutSchema,
  },
  { additionalProperties: false },
);

const QuizVideoProofSchema = Type.Object(
  {
    kind: Type.Literal("video"),
    assetId: ItemIdSchema,
    posterAssetId: ItemIdSchema,
    caption: ProofCaptionSchema,
    layout: ProofLayoutSchema,
    sound: Type.Boolean(),
    loop: Type.Boolean(),
    width: Type.Integer({ minimum: 1, maximum: PROOF_VIDEO_MAX_LONG_SIDE }),
    height: Type.Integer({ minimum: 1, maximum: PROOF_VIDEO_MAX_LONG_SIDE }),
    durationMs: Type.Integer({ minimum: 1, maximum: PROOF_VIDEO_MAX_DURATION_MS }),
  },
  { additionalProperties: false },
);

const QuizProofSchema = Type.Union([QuizPhotoProofSchema, QuizVideoProofSchema]);
export type QuizProof = Static<typeof QuizProofSchema>;

const QuizQuestionSchema = Type.Object(
  {
    id: ItemIdSchema,
    kind: Type.Enum(POP_QUIZ_QUESTION_KINDS),
    text: QuizTextSchema,
    images: Type.Array(ItemIdSchema, { maxItems: POP_QUIZ_MAX_IMAGES_PER_QUESTION }),
    imageHint: Type.Optional(Type.String({ minLength: 1, maxLength: POP_QUIZ_IMAGE_HINT_MAX_LENGTH })),
    answers: Type.Object(
      {
        squircle: AnswerTextSchema,
        triangle: AnswerTextSchema,
        plus: AnswerTextSchema,
        dome: AnswerTextSchema,
      },
      { additionalProperties: false },
    ),
    correct: Type.Union([Type.Enum(QUIZ_ANSWER_KEYS), Type.Null()]),
    timeLimitSeconds: Type.Union([Type.Enum(POP_QUIZ_TIME_LIMITS), Type.Null()]),
    points: Type.Enum(POP_QUIZ_POINT_LEVELS),
    proof: Type.Optional(QuizProofSchema),
  },
  { additionalProperties: false },
);
export type QuizQuestion = Static<typeof QuizQuestionSchema>;

export const PopQuizConfigSchema = Type.Object(
  {
    questions: Type.Array(QuizQuestionSchema, { maxItems: POP_QUIZ_MAX_QUESTIONS }),
    timeLimitSeconds: Type.Enum(POP_QUIZ_TIME_LIMITS),
    speedBonus: Type.Boolean(),
    leaderboardAfterEachQuestion: Type.Boolean(),
    autoNextQuestion: Type.Optional(Type.Boolean()),
    shuffleAnswers: Type.Boolean(),
  },
  { additionalProperties: false },
);
export type PopQuizConfig = Static<typeof PopQuizConfigSchema>;
