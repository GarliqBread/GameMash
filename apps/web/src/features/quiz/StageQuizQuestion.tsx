import type { QuizStageView } from "@gamemash/games/config";
import {
  AnswerGrid,
  CountStat,
  Heading,
  QuestionImageGrid,
  RichText,
  StageLayout,
  StageViewport,
  TIMER_WARNING_SECONDS,
  TimerRing,
} from "@gamemash/ui";
import { FormattedMessage, useIntl } from "react-intl";
import type { LobbyStatus } from "../../lib/lobby";
import { HostNextButton } from "../game/HostNextButton";
import { useSecondsLabel } from "../game/useSecondsLabel";
import { useSecondsLeft } from "../game/useSecondsLeft";
import { ReconnectingNote } from "../session/ReconnectingNote";
import { useProofPreload } from "./proof-media";
import { QuizStageHeader } from "./QuizStageHeader";
import { useAnswerOptions } from "./useAnswerOptions";
import { useQuestionImages } from "./useQuestionImages";

const LONG_QUESTION_LENGTH = 90;

type AskingView = Extract<QuizStageView, { kind: "question" | "answering" }>;

export type StageQuizQuestionProps = {
  view: AskingView;
  phaseId: number;
  phaseEndsAt: number | null;
  waitsForHost: boolean;
  status: LobbyStatus;
};

const ShowAnswersFooter = ({ phaseId, status }: { phaseId: number; status: LobbyStatus }) => (
  <div className="ml-auto flex shrink-0 items-center gap-6">
    <ReconnectingNote status={status} />
    <HostNextButton key={phaseId} phaseId={phaseId} label={<FormattedMessage id="quiz.showAnswers" />} />
  </div>
);

export const StageQuizQuestion = ({ view, phaseId, phaseEndsAt, waitsForHost, status }: StageQuizQuestionProps) => {
  const intl = useIntl();
  const toOptions = useAnswerOptions();
  const seconds = useSecondsLeft(phaseEndsAt);
  const images = useQuestionImages(view.images);
  useProofPreload(view.proof);
  const hasImages = view.images.length > 0;
  const isLong = view.text.reduce((length, run) => length + run.text.length, 0) > LONG_QUESTION_LENGTH;
  const headingSize = hasImages ? (isLong ? "stage-section" : "stage-sub") : isLong ? "stage-sub" : "stage-hero";
  const secondsLabel = useSecondsLabel();

  return (
    <StageViewport>
      <StageLayout
        mainClassName={hasImages ? "gap-8" : "gap-10"}
        header={
          <QuizStageHeader
            className="min-h-[148px]"
            progress={view}
            right={
              view.kind === "answering" && (
                <>
                  <CountStat
                    value={view.answeredCount}
                    total={view.participantCount}
                    caption={<FormattedMessage id="quiz.answered" />}
                  />
                  <TimerRing
                    seconds={seconds}
                    total={view.timeLimitSeconds}
                    label={secondsLabel(seconds)}
                    warningLabel={secondsLabel(TIMER_WARNING_SECONDS)}
                  />
                </>
              )
            }
          />
        }
        footer={
          view.kind === "question" && waitsForHost ? (
            <ShowAnswersFooter phaseId={phaseId} status={status} />
          ) : status === "reconnecting" ? (
            <ReconnectingNote status={status} />
          ) : undefined
        }
      >
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8">
          <Heading size={headingSize} className="max-w-[1500px] text-center font-medium hyphens-auto wrap-break-word">
            <RichText runs={view.text} />
          </Heading>
          {hasImages && (
            <div className="min-h-0 w-full flex-1">
              <QuestionImageGrid images={images} />
            </div>
          )}
          {view.kind === "question" && !waitsForHost && (
            <p className="text-stage-lg text-fg-subtle">
              <FormattedMessage id="quiz.getReady" />
            </p>
          )}
        </div>
        {view.kind === "answering" && (
          <AnswerGrid
            aria-label={intl.formatMessage({ id: "quiz.answerOptions" })}
            options={toOptions(view.answers)}
            density={hasImages ? "compact" : "regular"}
          />
        )}
      </StageLayout>
    </StageViewport>
  );
};
