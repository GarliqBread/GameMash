import type { QuizProgress } from "@gamemash/games/config";
import { StageHeader } from "@gamemash/ui";
import type { ReactNode } from "react";
import { FormattedMessage } from "react-intl";

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
