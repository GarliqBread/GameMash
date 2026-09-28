import { Button, Heading, Logo, PhoneShell, TrustNote } from "@gamemash/ui";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FormattedMessage } from "react-intl";
import { saveCredentials } from "../lib/credentials";
import { toApiError, useErrorMessage } from "../lib/errors";
import { createSession } from "../lib/sessions";

const HostStartPage = () => {
  const navigate = useNavigate();
  const formatError = useErrorMessage();
  const create = useMutation({
    mutationFn: createSession,
    onSuccess: ({ sessionId, roomCode, hostToken }) => {
      saveCredentials({ role: "host", sessionId, roomCode, hostToken });
      void navigate({ to: "/host/$sessionId/setup", params: { sessionId } });
    },
  });

  return (
    <PhoneShell
      theme="paper"
      mainClassName="gap-4"
      header={<Logo />}
      footer={
        <TrustNote>
          <FormattedMessage id="lobby.trust" />
        </TrustNote>
      }
      bottomAction={
        <Button size="lg" disabled={create.isPending} onClick={() => create.mutate()}>
          <FormattedMessage id={create.isPending ? "host.creating" : "host.create"} />
        </Button>
      }
    >
      <Heading>
        <FormattedMessage id="host.title" />
      </Heading>
      <p className="text-xl text-fg-muted">
        <FormattedMessage id="host.body" />
      </p>
      {create.isError && (
        <p role="alert" className="text-body font-bold text-danger">
          {formatError(toApiError(create.error))}
        </p>
      )}
    </PhoneShell>
  );
};

export const Route = createFileRoute("/host/")({
  component: HostStartPage,
});
