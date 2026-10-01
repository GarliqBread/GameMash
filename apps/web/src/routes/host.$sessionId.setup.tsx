import { Button } from "@gamemash/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FormattedMessage } from "react-intl";
import { useHostCredentials } from "../features/host/host-credentials";
import { StageMessage } from "../features/session/StageMessage";
import { SetupWorkshop } from "../features/setup/SetupWorkshop";
import { sessionSetupKey } from "../lib/query-keys";
import { fetchSetup } from "../lib/setup";

const SetupPage = () => {
  const credentials = useHostCredentials();
  const setup = useQuery({
    queryKey: sessionSetupKey(credentials.sessionId),
    queryFn: () => fetchSetup(credentials),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
    refetchOnReconnect: false,
  });

  if (setup.data)
    return (
      <SetupWorkshop
        credentials={credentials}
        initialSetup={setup.data.setup}
        imagesEnabled={setup.data.imagesEnabled}
      />
    );
  if (setup.isError) {
    return (
      <StageMessage
        title={<FormattedMessage id="setup.loadFailedTitle" />}
        body={<FormattedMessage id="setup.loadFailedBody" />}
        action={
          <Button size="stage" disabled={setup.isFetching} onClick={() => void setup.refetch()}>
            <FormattedMessage id="setup.retry" />
          </Button>
        }
      />
    );
  }
  return <div data-theme="workshop" className="min-h-dvh bg-bg" />;
};

export const Route = createFileRoute("/host/$sessionId/setup")({
  component: SetupPage,
});
