import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { PlayGame } from "../features/play/PlayGame";
import { WaitingScreen } from "../features/play/WaitingScreen";
import { PhoneMessage } from "../features/session/PhoneMessage";
import { loadPlayerCredentials, type PlayerCredentials } from "../lib/credentials";
import { useLobbyConnection, useLobbyStore } from "../lib/lobby";
import { avatarSrc } from "../lib/players";

type PlaySearch = {
  photo?: "failed" | undefined;
};

const PlayerLobby = ({ credentials, isPhotoFailed }: { credentials: PlayerCredentials; isPhotoFailed: boolean }) => {
  useLobbyConnection(credentials);
  const status = useLobbyStore((store) => store.status);
  const state = useLobbyStore((store) => store.state);
  const game = useLobbyStore((store) => store.game);
  const me = state?.players.find((player) => player.id === credentials.playerId);

  if (status === "ended") {
    return (
      <PhoneMessage
        title={<FormattedMessage id="ended.title" />}
        body={<FormattedMessage id="ended.playerBody" />}
        actionLabel={<FormattedMessage id="ended.playerAction" />}
      />
    );
  }

  if (game && state && state.status !== "lobby") {
    return (
      <PlayGame
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

  return (
    <WaitingScreen
      credentials={credentials}
      me={me}
      playerCount={state?.players.length}
      status={status}
      isPhotoFailed={isPhotoFailed}
    />
  );
};

const PlayPage = () => {
  const { sessionId } = Route.useParams();
  const { photo } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [isPhotoFailed] = useState(photo === "failed");
  useEffect(() => {
    if (photo) void navigate({ search: {}, replace: true });
  }, [photo, navigate]);
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
  return <PlayerLobby credentials={credentials} isPhotoFailed={isPhotoFailed} />;
};

export const Route = createFileRoute("/play/$sessionId")({
  validateSearch: (search: Record<string, unknown>): PlaySearch =>
    search.photo === "failed" ? { photo: "failed" } : {},
  component: PlayPage,
});
