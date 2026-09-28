import { createFileRoute } from "@tanstack/react-router";
import { useHostCredentials } from "../features/host/host-credentials";
import { StageLobby } from "../features/lobby/StageLobby";
import { useLobbyStore } from "../lib/lobby";

const HostLobbyPage = () => {
  const credentials = useHostCredentials();
  const status = useLobbyStore((store) => store.status);
  const state = useLobbyStore((store) => store.state);

  return (
    <StageLobby
      sessionId={credentials.sessionId}
      roomCode={credentials.roomCode}
      sessionName={state?.sessionName ?? ""}
      lineup={state?.lineup ?? []}
      players={state?.players ?? []}
      status={status}
    />
  );
};

export const Route = createFileRoute("/host/$sessionId/")({
  component: HostLobbyPage,
});
