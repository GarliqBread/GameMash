import type { DrawItStageView } from "@gamemash/games/config";
import type { PlayingSnapshot } from "@gamemash/shared";
import { FormattedMessage } from "react-intl";
import { HostNextButton } from "../game/HostNextButton";
import type { StageGameProps } from "../games/game-views";
import { StageDrawing } from "./StageDrawing";
import { StageDrawResults } from "./StageDrawResults";
import { StageRating } from "./StageRating";

const nextLabelId = (snapshot: PlayingSnapshot, view: DrawItStageView) => {
  if (view.roundIndex + 1 < view.roundCount) return "draw.nextRoundIn";
  return snapshot.gameIndex + 1 < snapshot.gameCount ? "draw.nextGameIn" : "draw.finalScoresIn";
};

export const StageDrawIt = ({ snapshot, view, players, status }: StageGameProps<DrawItStageView>) => {
  const roundKey = `${snapshot.gameIndex}:${view.roundIndex}`;
  if (view.kind === "draw") {
    return <StageDrawing view={view} players={players} phaseEndsAt={snapshot.phaseEndsAt} status={status} />;
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
