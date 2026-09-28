import type { QuizStageView } from "@gamemash/games/config";
import {
  AnswerGrid,
  CountStat,
  Heading,
  QuestionImageGrid,
  RichText,
  StageLayout,
  StageViewport,
  TimerRing,
} from "@gamemash/ui";
import { FormattedMessage, useIntl } from "react-intl";
import type { LobbyStatus } from "../../lib/lobby";
import { useSecondsLeft } from "../game/useSecondsLeft";
import { ReconnectingNote } from "../session/ReconnectingNote";
import { QuizStageHeader, useAnswerOptions } from "./quiz-display";
import { useQuestionImages } from "./useQuestionImages";

type AskingView = Extract<QuizStageView, { kind: "question" | "answering" }>;

const WARNING_SECONDS = 5;

export type StageQuizQuestionProps = {
  view: AskingView;
  phaseEndsAt: number | null;
  status: LobbyStatus;
};

export const StageQuizQuestion = ({ view, phaseEndsAt, status }: StageQuizQuestionProps) => {
  const intl = useIntl();
  const toOptions = useAnswerOptions();
  const seconds = useSecondsLeft(phaseEndsAt);
  const images = useQuestionImages(view.images);
  const hasImages = view.images.length > 0;
  const secondsLabel = (value: number) => intl.formatMessage({ id: "quiz.secondsLeft" }, { seconds: value });

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
                    warningLabel={secondsLabel(WARNING_SECONDS)}
                  />
                </>
              )
            }
          />
        }
        footer={status === "reconnecting" ? <ReconnectingNote status={status} /> : undefined}
      >
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8">
          <Heading
            size={hasImages ? "stage-sub" : "stage-hero"}
            className="max-w-[1500px] text-center font-medium hyphens-auto wrap-break-word"
          >
            <RichText runs={view.text} />
          </Heading>
          {hasImages && (
            <div className="min-h-0 w-full flex-1">
              <QuestionImageGrid images={images} />
            </div>
          )}
          {view.kind === "question" && (
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
