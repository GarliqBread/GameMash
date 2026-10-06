import {
  POP_QUIZ_PROOF_ALT_MAX_LENGTH,
  POP_QUIZ_PROOF_CAPTION_MAX_LENGTH,
  type QuizProof,
  type QuizProofLayout,
  type QuizQuestion,
} from "@gamemash/games/config";
import {
  formatClock,
  MS_PER_MINUTE,
  PROOF_PHOTOS_MAX,
  PROOF_VIDEO_MAX_DURATION_MS,
  stripHiddenCharacters,
} from "@gamemash/shared";
import {
  CheckIcon,
  KeyButton,
  PencilIcon,
  ProofUpload,
  type ProofUploadState,
  RadioCardGroup,
  Sticker,
  TextField,
  ToolButton,
  WorkshopDialog,
} from "@gamemash/ui";
import { type ReactNode, useId, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useErrorMessage } from "../../lib/errors";
import type { ProofMediaErrorCode } from "../../lib/proof-media/errors";
import { PROOF_ACCEPT, PROOF_PHOTO_TYPES } from "../../lib/proof-media/limits";
import { useSessionImages } from "../quiz/useQuestionImages";
import {
  type ActiveProofJob,
  type ProofFailure,
  type ProofJob,
  type ProofResult,
  type ProofUploads,
  type UploadedProof,
  useProofJob,
  useProofResult,
} from "./useProofUploads";

const BYTES_PER_MB = 1_000_000;
const PHOTO_ACCEPT = [...PROOF_PHOTO_TYPES, "image/gif"].join(",");
const MEDIA_ERROR_IDS: Record<ProofMediaErrorCode, string> = {
  unsupported_type: "setup.proofErrorUnsupportedType",
  unreadable: "setup.proofErrorUnreadable",
  too_long: "setup.proofErrorTooLong",
  too_large: "setup.proofErrorTooLarge",
  unsupported_browser: "setup.proofErrorUnsupportedBrowser",
  failed: "setup.proofErrorFailed",
};

const megabytes = (bytes: number) => Math.max(1, Math.round(bytes / BYTES_PER_MB));

const newProof = (previous: QuizProof | undefined, uploaded: UploadedProof): QuizProof => {
  const caption = previous?.caption ?? "";
  const layout = previous?.layout ?? "side";
  if (uploaded.kind === "image") {
    const { assetId, width, height } = uploaded;
    return { kind: "image", photos: [{ assetId, alt: "", width, height }], caption, layout };
  }
  const { assetId, posterAssetId, width, height, durationMs, hasAudio, loop } = uploaded;
  return {
    kind: "video",
    assetId,
    posterAssetId,
    width,
    height,
    durationMs,
    loop,
    sound: hasAudio,
    caption,
    layout,
  };
};

const withSecondPhoto = (previous: QuizProof | undefined, uploaded: UploadedProof): QuizProof => {
  if (previous?.kind !== "image" || uploaded.kind !== "image" || previous.photos.length >= PROOF_PHOTOS_MAX) {
    return newProof(previous, uploaded);
  }
  const { assetId, width, height } = uploaded;
  return { ...previous, photos: [...previous.photos, { assetId, alt: "", width, height }] };
};

const withoutPhoto = (proof: QuizProof, position: number): QuizProof | undefined => {
  if (proof.kind !== "image") return undefined;
  const photos = proof.photos.filter((_, index) => index !== position - 1);
  return photos.length > 0 ? { ...proof, photos } : undefined;
};

const isDescribed = (proof: QuizProof) =>
  proof.caption.trim().length > 0 && (proof.kind === "video" || proof.photos.every((photo) => photo.alt.trim()));

const useProofCopy = () => {
  const intl = useIntl();
  const formatError = useErrorMessage();
  const text = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values);

  const failureMessage = (failure: ProofFailure) =>
    failure.kind === "api"
      ? formatError(failure.error)
      : text(MEDIA_ERROR_IDS[failure.code], { minutes: PROOF_VIDEO_MAX_DURATION_MS / MS_PER_MINUTE });

  const jobState = (job: ActiveProofJob): ProofUploadState => ({
    status: "compressing",
    isVideo: job.isVideo,
    fileName: job.fileName,
    details: job.source
      ? text("setup.proofSourceVideo", {
          duration: formatClock(job.source.durationMs),
          megabytes: megabytes(job.sourceBytes),
          height: Math.min(job.source.width, job.source.height),
        })
      : text("setup.proofSourceFile", { megabytes: megabytes(job.sourceBytes) }),
    progress: job.progress,
    progressLabel: text(job.phase === "compressing" ? "setup.proofMakingSmaller" : "setup.proofUploadingLabel"),
    progressText: text(job.phase === "compressing" ? "setup.proofCompressProgress" : "setup.proofUploadProgress", {
      progress: job.progress,
    }),
  });

  const resultNote = (result: ProofResult | undefined) => {
    if (!result) return undefined;
    const id = result.wasReencoded ? "setup.proofMadeSmaller" : "setup.proofReady";
    return text(id, {
      from: megabytes(result.sourceBytes),
      to: megabytes(result.bytes),
      megabytes: megabytes(result.bytes),
      height: result.height,
    });
  };

  return { text, failureMessage, jobState, resultNote };
};

const useUploadState = (
  question: QuizQuestion,
  job: ProofJob | undefined,
  result: ProofResult | undefined,
): ProofUploadState => {
  const copy = useProofCopy();
  const proof = question.proof;
  const { data: urls } = useSessionImages(proof !== undefined);
  if (job?.phase === "failed") {
    return {
      status: "error",
      message: copy.failureMessage(job.failure),
      retryLabel: copy.text("setup.proofChooseAnother"),
      dismissLabel: copy.text(proof ? "setup.proofKeepCurrent" : "setup.proofCancel"),
      retryAddsPhoto: job.isSecondPhoto && proof?.kind === "image",
    };
  }
  if (job) return copy.jobState(job);
  if (!proof) return { status: "empty" };
  if (proof.kind === "video") {
    return {
      status: "video",
      posterSrc: urls?.get(proof.posterAssetId),
      duration: formatClock(proof.durationMs),
      note: copy.resultNote(result),
      sound: proof.sound,
    };
  }
  return {
    status: "photo",
    photos: proof.photos.map((photo) => ({ id: photo.assetId, src: urls?.get(photo.assetId), alt: photo.alt })),
    canAddPhoto: proof.photos.length < PROOF_PHOTOS_MAX,
    note: isDescribed(proof) ? copy.text("setup.proofDescribed") : undefined,
  };
};

const ProofHeading = ({ id, children }: { id: string; children?: ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <h3 id={id} className="font-pixel text-label font-bold tracking-pixel">
      <FormattedMessage id="setup.proofTitle" />{" "}
      <span className="font-normal text-fg-subtle">
        <FormattedMessage id="setup.proofOptional" />
      </span>
    </h3>
    {children}
  </div>
);

const AltTextDialog = ({
  proof,
  open,
  onOpenChange,
  onAltChange,
}: {
  proof: Extract<QuizProof, { kind: "image" }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAltChange: (position: number, alt: string) => void;
}) => {
  const intl = useIntl();
  return (
    <WorkshopDialog
      open={open}
      onOpenChange={onOpenChange}
      title={<FormattedMessage id="setup.proofAltTitle" values={{ count: proof.photos.length }} />}
      description={<FormattedMessage id="setup.proofAltDescription" />}
      closeLabel={intl.formatMessage({ id: "setup.proofAltClose" })}
      footer={
        <KeyButton size="md" className="workshop:bg-sun" onClick={() => onOpenChange(false)}>
          <FormattedMessage id="setup.proofAltDone" />
        </KeyButton>
      }
    >
      {proof.photos.map((photo, index) => (
        <TextField
          key={photo.assetId}
          size="host"
          label={<FormattedMessage id="setup.proofAltLabel" values={{ position: index + 1 }} />}
          value={photo.alt}
          maxLength={POP_QUIZ_PROOF_ALT_MAX_LENGTH}
          placeholder={intl.formatMessage({ id: "setup.proofAltPlaceholder" })}
          onValueChange={(alt: string) => onAltChange(index + 1, stripHiddenCharacters(alt))}
        />
      ))}
    </WorkshopDialog>
  );
};

const ProofFields = ({
  proof,
  onChange,
  headingId,
}: {
  proof: QuizProof;
  onChange: (update: (proof: QuizProof) => QuizProof) => void;
  headingId: string;
}) => {
  const intl = useIntl();
  const [isAltOpen, setIsAltOpen] = useState(false);
  const hasAlt = proof.kind === "image" && proof.photos.every((photo) => photo.alt.trim());
  const layoutLabelId = useId();

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2.5">
      <ProofHeading id={headingId}>
        {proof.kind === "image" && (
          <ToolButton
            icon={hasAlt ? <CheckIcon size={14} strokeWidth={3} /> : <PencilIcon size={14} strokeWidth={2.4} />}
            aria-label={intl.formatMessage({ id: hasAlt ? "setup.proofAltTextDone" : "setup.proofAltTextMissing" })}
            onClick={() => setIsAltOpen(true)}
            size="sm"
          >
            <FormattedMessage id="setup.proofAltText" />
          </ToolButton>
        )}
      </ProofHeading>
      <TextField
        size="host"
        label={<FormattedMessage id="setup.proofCaption" />}
        value={proof.caption}
        maxLength={POP_QUIZ_PROOF_CAPTION_MAX_LENGTH}
        placeholder={intl.formatMessage({ id: "setup.proofCaptionPlaceholder" })}
        onValueChange={(caption: string) =>
          onChange((current) => ({ ...current, caption: stripHiddenCharacters(caption) }))
        }
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span id={layoutLabelId} className="text-note font-bold">
          <FormattedMessage id="setup.proofLayout" />
        </span>
        <RadioCardGroup<QuizProofLayout>
          aria-labelledby={layoutLabelId}
          value={proof.layout}
          onValueChange={(layout) => onChange((current) => ({ ...current, layout }))}
          className="gap-2"
          size="sm"
          options={[
            { value: "side", label: intl.formatMessage({ id: "setup.proofLayoutSide" }) },
            { value: "big", label: intl.formatMessage({ id: "setup.proofLayoutBig" }) },
          ]}
        />
      </div>
      {proof.kind === "image" && (
        <AltTextDialog
          proof={proof}
          open={isAltOpen}
          onOpenChange={setIsAltOpen}
          onAltChange={(position, alt) =>
            onChange((current) =>
              current.kind === "image"
                ? {
                    ...current,
                    photos: current.photos.map((photo, index) => (index === position - 1 ? { ...photo, alt } : photo)),
                  }
                : current,
            )
          }
        />
      )}
    </div>
  );
};

export type QuestionProofProps = {
  question: QuizQuestion;
  onChange: (update: (current: QuizQuestion) => QuizQuestion) => void;
  proofUploads: ProofUploads;
};

export const QuestionProof = ({ question, onChange, proofUploads }: QuestionProofProps) => {
  const intl = useIntl();
  const headingId = useId();
  const job = useProofJob(question.id);
  const state = useUploadState(question, job, useProofResult(question.id));
  const proof = question.proof;
  const isFilled = state.status === "photo" || state.status === "video";

  const setProof = (update: (current: QuizProof | undefined) => QuizProof | undefined) =>
    onChange(({ proof: current, ...rest }) => {
      const next = update(current);
      return next ? { ...rest, proof: next } : rest;
    });

  const upload = (file: File, isSecondPhoto: boolean) => {
    const merge = isSecondPhoto ? withSecondPhoto : newProof;
    void proofUploads.start(question.id, file, isSecondPhoto, (uploaded) =>
      setProof((current) => merge(current, uploaded)),
    );
  };

  const remove = () => {
    proofUploads.forget(question.id);
    setProof(() => undefined);
  };

  const removePhoto = (position: number) =>
    setProof((current) => (current?.kind === "image" ? withoutPhoto(current, position) : current));

  const uploader = (
    <ProofUpload
      state={state}
      accept={PROOF_ACCEPT}
      photoAccept={PHOTO_ACCEPT}
      onFileSelect={(file) => upload(file, false)}
      onAddPhoto={(file) => upload(file, true)}
      onCancel={() => proofUploads.cancel(question.id)}
      onRemove={remove}
      onRemovePhoto={removePhoto}
      onDismiss={() => proofUploads.dismiss(question.id)}
      onSoundChange={(sound) => setProof((current) => (current?.kind === "video" ? { ...current, sound } : current))}
      dropLabel={intl.formatMessage({ id: "setup.proofDrop" })}
      chooseLabel={intl.formatMessage({ id: "setup.proofChoose" })}
      formatsLabel={intl.formatMessage(
        { id: "setup.proofFormats" },
        { minutes: PROOF_VIDEO_MAX_DURATION_MS / MS_PER_MINUTE },
      )}
      cancelLabel={intl.formatMessage({ id: "setup.proofCancel" })}
      replaceLabel={intl.formatMessage({ id: "setup.proofReplace" })}
      removeLabel={intl.formatMessage({ id: "setup.proofRemove" })}
      removePhotoLabel={(position) => intl.formatMessage({ id: "setup.proofRemovePhoto" }, { position })}
      addPhotoLabel={intl.formatMessage({ id: "setup.proofAddPhoto" })}
      photoLabel={intl.formatMessage({ id: "setup.proofPhoto" })}
      videoLabel={intl.formatMessage({ id: "setup.proofVideo" })}
      soundLabel={intl.formatMessage({ id: "setup.proofSound" })}
    />
  );

  return (
    <section
      aria-labelledby={headingId}
      className="relative flex gap-4.5 rounded-card border-3 border-ink-950 bg-paper-white p-3.5 pr-4 shadow-brutal-md"
    >
      <Sticker tone="lime" rotate={4} aria-hidden="true" className="absolute -top-3.5 -right-3">
        <FormattedMessage id="setup.proofNew" />
      </Sticker>
      <div className={isFilled ? "w-62 shrink-0" : "flex min-w-0 flex-1 flex-col gap-3"}>
        {!isFilled && <ProofHeading id={headingId} />}
        {uploader}
      </div>
      {isFilled && proof && (
        <ProofFields
          proof={proof}
          headingId={headingId}
          onChange={(update) => setProof((current) => current && update(current))}
        />
      )}
    </section>
  );
};
