import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useMemo } from "react";
import { FormattedMessage } from "react-intl";
import { HostCredentialsContext } from "../features/host/host-credentials";
import { NewSessionLink, StageMessage } from "../features/session/StageMessage";
import { type HostCredentials, loadHostCredentials } from "../lib/credentials";
import { useLobbyConnection, useLobbyStore } from "../lib/lobby";

const HostSession = ({ credentials }: { credentials: HostCredentials }) => {
  useLobbyConnection(credentials);
  const status = useLobbyStore((store) => store.status);

  if (status === "ended") {
    return (
      <StageMessage
        title={<FormattedMessage id="ended.title" />}
        body={<FormattedMessage id="ended.hostBody" />}
        action={<NewSessionLink />}
      />
    );
  }

  return (
    <HostCredentialsContext value={credentials}>
      <Outlet />
    </HostCredentialsContext>
  );
};

const HostSessionLayout = () => {
  const { sessionId } = Route.useParams();
  const credentials = useMemo(() => loadHostCredentials(sessionId), [sessionId]);
  if (!credentials) {
    return (
      <StageMessage
        title={<FormattedMessage id="missing.hostTitle" />}
        body={<FormattedMessage id="missing.hostBody" />}
        action={<NewSessionLink />}
      />
    );
  }
  return <HostSession credentials={credentials} />;
};

export const Route = createFileRoute("/host/$sessionId")({
  component: HostSessionLayout,
});
