import { POP_QUIZ_MAX_IMAGES_PER_QUESTION, type QuizQuestion } from "@gamemash/games/config";
import { QUESTION_IMAGE_CONTENT_TYPES } from "@gamemash/shared";
import { ImageHint, ImageIcon, QuestionImageStrip, ToolButton } from "@gamemash/ui";
import { type ChangeEvent, type ReactNode, useRef } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useErrorMessage } from "../../lib/errors";
import { useSessionImages } from "../quiz/useQuestionImages";
import type { ImageUploads } from "./useImageUploads";

const ACCEPT = ["image/png", "image/gif", "image/avif", ...QUESTION_IMAGE_CONTENT_TYPES].join(",");

export type QuestionImagesProps = {
  question: QuizQuestion;
  onChange: (update: (current: QuizQuestion) => QuizQuestion) => void;
  uploads: ImageUploads;
  isEnabled: boolean;
  children: ReactNode;
};

export const QuestionImages = ({ question, onChange, uploads, isEnabled, children }: QuestionImagesProps) => {
  const intl = useIntl();
  const formatError = useErrorMessage();
  const { data: urls } = useSessionImages(question.images.length > 0);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCount = uploads.pendingCount(question.id);
  const error = uploads.error(question.id);
  const room = POP_QUIZ_MAX_IMAGES_PER_QUESTION - question.images.length - pendingCount;

  const attach = (imageId: string) =>
    onChange((current) =>
      current.images.length >= POP_QUIZ_MAX_IMAGES_PER_QUESTION
        ? current
        : { ...current, images: [...current.images, imageId] },
    );

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])].slice(0, Math.max(room, 0));
    event.target.value = "";
    if (files.length > 0) void uploads.upload(question.id, files, attach);
  };

  const removeHint = () => onChange(({ imageHint: _, ...current }) => current);

  const remove = (imageId: string) =>
    onChange((current) => ({ ...current, images: current.images.filter((id) => id !== imageId) }));

  return (
    <>
      {isEnabled && (
        <QuestionImageStrip
          images={question.images.map((id, index) => ({
            id,
            url: urls?.get(id),
            alt: intl.formatMessage({ id: "quiz.imageAlt" }, { position: index + 1, count: question.images.length }),
          }))}
          pendingCount={pendingCount}
          onRemove={remove}
          removeLabel={(position) => intl.formatMessage({ id: "setup.removeImage" }, { position })}
          pendingLabel={intl.formatMessage({ id: "setup.uploadingImage" })}
          error={error && formatError(error)}
        />
      )}
      {isEnabled && question.imageHint && (
        <ImageHint
          label={<FormattedMessage id="setup.imageHint" />}
          hint={question.imageHint}
          removeLabel={intl.formatMessage({ id: "setup.removeImageHint" })}
          onRemove={removeHint}
        />
      )}
      <div className="mt-1 flex flex-wrap gap-3">
        {isEnabled && (
          <>
            <ToolButton
              icon={<ImageIcon size={18} strokeWidth={2.2} />}
              onClick={() => inputRef.current?.click()}
              disabled={room <= 0}
            >
              <FormattedMessage
                id="setup.addImage"
                values={{ count: question.images.length, max: POP_QUIZ_MAX_IMAGES_PER_QUESTION }}
              />
            </ToolButton>
            <input ref={inputRef} type="file" accept={ACCEPT} multiple hidden onChange={handleFiles} />
          </>
        )}
        {children}
      </div>
    </>
  );
};
