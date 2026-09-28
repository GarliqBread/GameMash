import { createFileRoute } from "@tanstack/react-router";
import { StageGame } from "../features/game/StageGame";
import { useSocketAction } from "../features/game/useSocketAction";
import { useHostCredentials } from "../features/host/host-credentials";
import { StageLobby } from "../features/lobby/StageLobby";
import { useErrorMessage } from "../lib/errors";
import { startSession, useLobbyStore } from "../lib/lobby";

const HostLobbyPage = () => {
  const credentials = useHostCredentials();
  const status = useLobbyStore((store) => store.status);
  const state = useLobbyStore((store) => store.state);
  const game = useLobbyStore((store) => store.game);
  const start = useSocketAction(startSession);
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
      startError={start.error ? errorMessage(start.error) : null}
      onStart={() => void start.run()}
    />
  );
};

export const Route = createFileRoute("/host/$sessionId/")({
  component: HostLobbyPage,
});
