import { createFileRoute } from "@tanstack/react-router";
import { StageGame } from "../features/game/StageGame";
import { useSocketAction } from "../features/game/useSocketAction";
import { useHostCredentials } from "../features/host/host-credentials";
import { StageLobby } from "../features/lobby/StageLobby";
import { useErrorMessage } from "../lib/errors";
import { kickPlayer, startSession, useLobbyStore } from "../lib/lobby";

const HostLobbyPage = () => {
  const credentials = useHostCredentials();
  const status = useLobbyStore((store) => store.status);
  const state = useLobbyStore((store) => store.state);
  const game = useLobbyStore((store) => store.game);
  const start = useSocketAction(startSession);
  const kick = useSocketAction(kickPlayer);
  const actionError = start.error ?? kick.error;
  const errorMessage = useErrorMessage();
  const sessionName = state?.sessionName ?? "";

  if (game && state && state.status !== "lobby") {
    return <StageGame sessionId={credentials.sessionId} sessionName={sessionName} snapshot={game} status={status} />;
  }

  return (
    <StageLobby
      sessionId={credentials.sessionId}
      roomCode={credentials.roomCode}
      sessionName={sessionName}
      lineup={state?.lineup ?? []}
      players={state?.players ?? []}
      status={status}
      isStarting={start.isPending || state?.status === "playing"}
      actionError={actionError ? errorMessage(actionError) : null}
      onStart={() => void start.run()}
      onRemovePlayer={(playerId) => void kick.run(playerId)}
    />
  );
};

export const Route = createFileRoute("/host/$sessionId/")({
  component: HostLobbyPage,
});
