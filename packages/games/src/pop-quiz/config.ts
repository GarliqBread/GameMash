import { hasHiddenCharacters, PROOF_VIDEO_MAX_SHORT_SIDE } from "@gamemash/shared";
import type { GameConfigRules, ImageIdMap } from "../game-config.js";
import type { MediaRef } from "../media.js";
import { hasUniqueIds } from "../unique.js";
import type { PopQuizConfig, QuizProof, QuizProofPhoto, QuizQuestion, QuizText } from "./schema.js";

export type { PopQuizConfig, QuizProof, QuizProofPhoto, QuizQuestion, QuizText, QuizTextRun } from "./schema.js";

export const POP_QUIZ_QUESTION_MAX_LENGTH = 90;
export const POP_QUIZ_TEXT_MAX_RUNS = 40;
export const POP_QUIZ_ANSWER_MAX_LENGTH = 40;
export const POP_QUIZ_MAX_QUESTIONS = 50;
export const POP_QUIZ_MAX_IMAGES_PER_QUESTION = 9;
export const POP_QUIZ_IMAGE_HINT_MAX_LENGTH = 60;
export const POP_QUIZ_TIME_LIMITS = [10, 20, 30, 60, 120];
export const POP_QUIZ_PROOF_CAPTION_MAX_LENGTH = 120;
export const POP_QUIZ_PROOF_ALT_MAX_LENGTH = 250;

export type QuizProofLayout = "side" | "big";
export const POP_QUIZ_PROOF_LAYOUTS: QuizProofLayout[] = ["side", "big"];

export type QuizPointLevel = "standard" | "double";
export const POP_QUIZ_POINT_LEVELS: QuizPointLevel[] = ["standard", "double"];
export const POP_QUIZ_POINTS: Record<QuizPointLevel, number> = { standard: 1000, double: 2000 };

export type QuizAnswerKey = "squircle" | "triangle" | "plus" | "dome";
export const QUIZ_ANSWER_KEYS: QuizAnswerKey[] = ["squircle", "triangle", "plus", "dome"];
const TRUE_FALSE_ANSWER_KEYS: QuizAnswerKey[] = ["plus", "squircle"];

export type QuizQuestionKind = "choice" | "trueFalse";
export const POP_QUIZ_QUESTION_KINDS: QuizQuestionKind[] = ["choice", "trueFalse"];

export const emptyQuestion = (id: string): QuizQuestion => ({
  id,
  kind: "choice",
  text: [],
  images: [],
  answers: { squircle: "", triangle: "", plus: "", dome: "" },
  correct: null,
  timeLimitSeconds: null,
  points: "standard",
});

export const defaultPopQuizConfig = (firstQuestionId: string): PopQuizConfig => ({
  questions: [emptyQuestion(firstQuestionId)],
  timeLimitSeconds: 20,
  speedBonus: true,
  leaderboardAfterEachQuestion: true,
  autoNextQuestion: true,
  shuffleAnswers: false,
});

const quizPlainText = (text: QuizText) => text.map((run) => run.text).join("");

export const questionTimeLimit = (config: PopQuizConfig, question: QuizQuestion) =>
  question.timeLimitSeconds ?? config.timeLimitSeconds;

const quizTimeRange = (config: PopQuizConfig) => {
  const times = config.questions.map((question) => questionTimeLimit(config, question));
  if (times.length === 0) return { min: config.timeLimitSeconds, max: config.timeLimitSeconds };
  return { min: Math.min(...times), max: Math.max(...times) };
};

const isQuestionTextValid = (text: QuizText) => {
  const plain = quizPlainText(text);
  return plain.length <= POP_QUIZ_QUESTION_MAX_LENGTH && !hasHiddenCharacters(plain);
};

const isImageHintValid = (hint: string | undefined) => hint === undefined || !hasHiddenCharacters(hint);

const isVideoSizeValid = (proof: Extract<QuizProof, { kind: "video" }>) =>
  Math.min(proof.width, proof.height) <= PROOF_VIDEO_MAX_SHORT_SIDE && proof.assetId !== proof.posterAssetId;

const arePhotosValid = (proof: Extract<QuizProof, { kind: "image" }>) =>
  proof.photos.every((photo) => !hasHiddenCharacters(photo.alt)) &&
  new Set(proof.photos.map((photo) => photo.assetId)).size === proof.photos.length;

const isProofValid = (proof: QuizProof | undefined) =>
  proof === undefined ||
  (!hasHiddenCharacters(proof.caption) && (proof.kind === "video" ? isVideoSizeValid(proof) : arePhotosValid(proof)));

const proofMediaRefs = (proof: QuizProof | undefined): MediaRef[] => {
  if (!proof) return [];
  if (proof.kind === "image") return proof.photos.map((photo) => ({ id: photo.assetId, role: "proofPhoto" }));
  return [
    { id: proof.assetId, role: "proofVideo" },
    { id: proof.posterAssetId, role: "proofPoster" },
  ];
};

const questionMediaRefs = (question: QuizQuestion): MediaRef[] => [
  ...question.images.map((id): MediaRef => ({ id, role: "questionImage" })),
  ...proofMediaRefs(question.proof),
];

const mapPhotos = (photos: QuizProofPhoto[], map: ImageIdMap) =>
  photos.flatMap((photo) => {
    const assetId = map(photo.assetId);
    return assetId ? [{ ...photo, assetId }] : [];
  });

const mapProof = (proof: QuizProof, map: ImageIdMap): QuizProof | undefined => {
  if (proof.kind === "image") {
    const photos = mapPhotos(proof.photos, map);
    return photos.length > 0 ? { ...proof, photos } : undefined;
  }
  const assetId = map(proof.assetId);
  const posterAssetId = map(proof.posterAssetId);
  return assetId && posterAssetId ? { ...proof, assetId, posterAssetId } : undefined;
};

const withMappedProof = (question: QuizQuestion, map: ImageIdMap): QuizQuestion => {
  const { proof, ...rest } = question;
  const mapped = proof && mapProof(proof, map);
  return mapped ? { ...rest, proof: mapped } : rest;
};

export const answerKeysOf = (question: QuizQuestion) =>
  question.kind === "trueFalse" ? TRUE_FALSE_ANSWER_KEYS : QUIZ_ANSWER_KEYS;

const isFilled = (value: string) => value.trim().length > 0;

const hasOnlyActiveAnswers = (question: QuizQuestion) => {
  const keys = answerKeysOf(question);
  const isUnused = (key: QuizAnswerKey) => !keys.includes(key);
  return (
    QUIZ_ANSWER_KEYS.filter(isUnused).every((key) => question.answers[key] === "") &&
    (question.correct === null || !isUnused(question.correct))
  );
};

export const isQuestionComplete = (question: QuizQuestion) =>
  isFilled(quizPlainText(question.text)) &&
  answerKeysOf(question).every((key) => isFilled(question.answers[key])) &&
  question.correct !== null;

export const popQuizConfigRules: GameConfigRules<PopQuizConfig> = {
  isValid: (config) =>
    hasUniqueIds(config.questions) &&
    config.questions.every(
      (question) =>
        isQuestionTextValid(question.text) &&
        hasOnlyActiveAnswers(question) &&
        isImageHintValid(question.imageHint) &&
        isProofValid(question.proof),
    ),
  isReady: (config) => config.questions.length > 0 && config.questions.every(isQuestionComplete),
  mediaRefs: (config) => config.questions.flatMap(questionMediaRefs),
  mapImages: (config, map) => ({
    ...config,
    questions: config.questions.map((question) => ({
      ...withMappedProof(question, map),
      images: question.images.flatMap((imageId) => map(imageId) ?? []),
    })),
  }),
  withNewIds: (config, newId) => ({
    ...config,
    questions: config.questions.map((question) => ({ ...question, id: newId() })),
  }),
  roundCount: (config) => config.questions.length,
  roundSeconds: quizTimeRange,
};
