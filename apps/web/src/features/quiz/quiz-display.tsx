import type { QuizAnswerOption, QuizProgress } from "@gamemash/games/config";
import { type AnswerOption, StageHeader } from "@gamemash/ui";
import type { ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";

export const useAnswerOptions = () => {
  const intl = useIntl();
  return (answers: QuizAnswerOption[]): AnswerOption[] =>
    answers.map(({ shape, text }) => ({
      shape,
      label: text,
      shapeLabel: intl.formatMessage({ id: "setup.shapeName" }, { shape }),
    }));
};

export const PhoneQuizProgress = ({ progress }: { progress: QuizProgress }) => (
  <span className="font-bold text-fg-muted">
    <FormattedMessage
      id="play.progress"
      values={{ current: progress.questionIndex + 1, total: progress.questionCount }}
    />
  </span>
);

export type QuizStageHeaderProps = {
  progress: QuizProgress;
  right?: ReactNode;
  className?: string | undefined;
};

export const QuizStageHeader = ({ progress, right, className }: QuizStageHeaderProps) => (
  <StageHeader
    className={className}
    game={<FormattedMessage id="game.popQuiz.title" />}
    progress={
      <FormattedMessage
        id="quiz.progress"
        values={{ current: progress.questionIndex + 1, total: progress.questionCount }}
      />
    }
    right={right}
  />
);
