import type { QuizStageView } from "@gamemash/games/config";
import type { PlayingSnapshot } from "@gamemash/shared";
import { FormattedMessage } from "react-intl";
import { HostNextButton } from "../game/HostNextButton";
import type { StageGameProps } from "../games/game-views";
import { StageQuizQuestion } from "./StageQuizQuestion";
import { StageQuizReveal } from "./StageQuizReveal";

const nextLabelId = (snapshot: PlayingSnapshot, view: QuizStageView) => {
  if (view.questionIndex + 1 < view.questionCount) return "game.nextQuestion";
  return snapshot.gameIndex + 1 < snapshot.gameCount ? "game.nextGame" : "game.showFinalScores";
};

export const StageQuiz = ({ snapshot, view, players, status }: StageGameProps<QuizStageView>) => {
  if (view.kind !== "reveal") {
    return <StageQuizQuestion view={view} phaseEndsAt={snapshot.phaseEndsAt} status={status} />;
  }
  return (
    <StageQuizReveal
      view={view}
      players={players}
      status={status}
      next={
        snapshot.waitsForHost && (
          <HostNextButton
            key={snapshot.phaseId}
            phaseId={snapshot.phaseId}
            label={<FormattedMessage id={nextLabelId(snapshot, view)} />}
          />
        )
      }
    />
  );
};
