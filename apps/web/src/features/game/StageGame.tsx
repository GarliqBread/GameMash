import type { GameSnapshot } from "@gamemash/shared";
import type { LobbyStatus } from "../../lib/lobby";
import { stageGameOf } from "../games/game-views";
import { GameStage } from "../games/stage-games";
import { HostFinalActions } from "./HostFinalActions";
import { StageFinalScores } from "./StageFinalScores";
import { usePlayers } from "./usePlayers";

export type StageGameProps = {
  sessionName: string;
  snapshot: GameSnapshot;
  status: LobbyStatus;
};

export const StageGame = ({ sessionName, snapshot, status }: StageGameProps) => {
  const players = usePlayers();

  if (snapshot.status === "finished") {
    return (
      <StageFinalScores
        sessionName={sessionName}
        standings={snapshot.standings}
        players={players}
        actions={<HostFinalActions sessionName={sessionName} status={status} />}
      />
    );
  }
  const game = stageGameOf(snapshot);
  if (!game) return null;
  return <GameStage game={game} snapshot={snapshot} players={players} status={status} />;
};
