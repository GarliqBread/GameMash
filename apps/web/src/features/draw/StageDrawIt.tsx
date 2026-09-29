import type { DrawItStageView } from "@gamemash/games/config";
import type { LobbyPlayer, PlayingSnapshot } from "@gamemash/shared";
import { FormattedMessage } from "react-intl";
import type { LobbyStatus } from "../../lib/lobby";
import { HostNextButton } from "../game/HostNextButton";
import { StageDrawing } from "./StageDrawing";
import { StageDrawResults } from "./StageDrawResults";
import { StageRating } from "./StageRating";

const nextLabelId = (snapshot: PlayingSnapshot, view: DrawItStageView) => {
  if (view.roundIndex + 1 < view.roundCount) return "draw.nextRoundIn";
  return snapshot.gameIndex + 1 < snapshot.gameCount ? "draw.nextGameIn" : "draw.finalScoresIn";
};

export type StageDrawItProps = {
  sessionId: string;
  snapshot: PlayingSnapshot;
  players: Map<string, LobbyPlayer>;
  status: LobbyStatus;
};

export const StageDrawIt = ({ sessionId, snapshot, players, status }: StageDrawItProps) => {
  const view = snapshot.view as DrawItStageView;
  const roundKey = `${snapshot.gameIndex}:${view.roundIndex}`;
  if (view.kind === "draw") {
    return (
      <StageDrawing
        sessionId={sessionId}
        view={view}
        players={players}
        phaseEndsAt={snapshot.phaseEndsAt}
        status={status}
      />
    );
  }
  if (view.kind === "rate") {
    return <StageRating roundKey={roundKey} view={view} phaseEndsAt={snapshot.phaseEndsAt} status={status} />;
  }
  return (
    <StageDrawResults
      roundKey={roundKey}
      view={view}
      players={players}
      phaseEndsAt={snapshot.phaseEndsAt}
      nextLabelId={nextLabelId(snapshot, view)}
      next={
        snapshot.canSkip && (
          <HostNextButton
            key={snapshot.phaseId}
            phaseId={snapshot.phaseId}
            label={<FormattedMessage id="draw.nextNow" />}
          />
        )
      }
      status={status}
    />
  );
};
