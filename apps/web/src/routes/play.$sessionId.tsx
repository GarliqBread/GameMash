import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { FormattedMessage } from "react-intl";
import { PlayGame } from "../features/play/PlayGame";
import { WaitingScreen } from "../features/play/WaitingScreen";
import { PhoneMessage } from "../features/session/PhoneMessage";
import { loadPlayerCredentials, type PlayerCredentials } from "../lib/credentials";
import { useActiveGame, useLobbyConnection, useLobbyStore } from "../lib/lobby";
import { avatarSrc } from "../lib/players";

const PlayerLobby = ({ credentials }: { credentials: PlayerCredentials }) => {
  useLobbyConnection(credentials);
  const status = useLobbyStore((store) => store.status);
  const state = useLobbyStore((store) => store.state);
  const game = useActiveGame();
  const me = state?.players.find((player) => player.id === credentials.playerId);

  if (status === "removed") {
    return (
      <PhoneMessage
        title={<FormattedMessage id="removed.title" />}
        body={<FormattedMessage id="removed.body" />}
        actionLabel={<FormattedMessage id="removed.action" />}
        roomCode={state?.roomCode}
      />
    );
  }

  if (status === "ended") {
    return (
      <PhoneMessage
        title={<FormattedMessage id="ended.title" />}
        body={<FormattedMessage id="ended.playerBody" />}
        actionLabel={<FormattedMessage id="ended.playerAction" />}
      />
    );
  }

  if (game) {
    return (
      <PlayGame
        credentials={credentials}
        me={{
          playerId: credentials.playerId,
          name: me?.name ?? credentials.name,
          avatarSrc: me ? avatarSrc(credentials.sessionId, me) : undefined,
        }}
        snapshot={game}
        status={status}
      />
    );
  }

  return <WaitingScreen credentials={credentials} me={me} playerCount={state?.players.length} status={status} />;
};

const PlayPage = () => {
  const { sessionId } = Route.useParams();
  const credentials = useMemo(() => loadPlayerCredentials(sessionId), [sessionId]);
  if (!credentials) {
    return (
      <PhoneMessage
        title={<FormattedMessage id="missing.playerTitle" />}
        body={<FormattedMessage id="missing.playerBody" />}
        actionLabel={<FormattedMessage id="ended.playerAction" />}
      />
    );
  }
  return <PlayerLobby credentials={credentials} />;
};

export const Route = createFileRoute("/play/$sessionId")({
  component: PlayPage,
});
