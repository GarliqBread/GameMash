import type { QuizStageView } from "@gamemash/games/config";
import type { GameSnapshot, PlayingSnapshot } from "@gamemash/shared";
import { FormattedMessage } from "react-intl";
import type { LobbyStatus } from "../../lib/lobby";
import { StageDrawIt } from "../draw/StageDrawIt";
import { StageQuizQuestion } from "../quiz/StageQuizQuestion";
import { StageQuizReveal } from "../quiz/StageQuizReveal";
import { HostNextButton } from "./HostNextButton";
import { StageFinalScores } from "./StageFinalScores";
import { usePlayers } from "./usePlayers";

const quizNextLabelId = (snapshot: PlayingSnapshot, view: QuizStageView) => {
  if (view.questionIndex + 1 < view.questionCount) return "game.nextQuestion";
  return snapshot.gameIndex + 1 < snapshot.gameCount ? "game.nextGame" : "game.showFinalScores";
};

export type StageGameProps = {
  sessionId: string;
  sessionName: string;
  snapshot: GameSnapshot;
  status: LobbyStatus;
};

export const StageGame = ({ sessionId, sessionName, snapshot, status }: StageGameProps) => {
  const players = usePlayers();

  if (snapshot.status === "finished") {
    return (
      <StageFinalScores
        sessionId={sessionId}
        sessionName={sessionName}
        standings={snapshot.standings}
        players={players}
      />
    );
  }
  if (snapshot.gameType === "draw-it") {
    return <StageDrawIt sessionId={sessionId} snapshot={snapshot} players={players} status={status} />;
  }
  if (snapshot.gameType !== "pop-quiz") return null;

  const view = snapshot.view as QuizStageView;
  if (view.kind !== "reveal") {
    return <StageQuizQuestion view={view} phaseEndsAt={snapshot.phaseEndsAt} status={status} />;
  }
  return (
    <StageQuizReveal
      sessionId={sessionId}
      view={view}
      players={players}
      status={status}
      next={
        snapshot.waitsForHost && (
          <HostNextButton
            key={snapshot.phaseId}
            phaseId={snapshot.phaseId}
            label={<FormattedMessage id={quizNextLabelId(snapshot, view)} />}
          />
        )
      }
    />
  );
};
