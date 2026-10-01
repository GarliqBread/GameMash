import { Button, ConfirmDialog } from "@gamemash/ui";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { useErrorMessage } from "../../lib/errors";
import { endSession, type LobbyStatus, resetSession } from "../../lib/lobby";
import { ReconnectingNote } from "../session/ReconnectingNote";
import { useSetupExport } from "../setup/useSetupExport";
import { useSocketAction } from "./useSocketAction";

export type HostFinalActionsProps = {
  sessionName: string;
  status: LobbyStatus;
};

export const HostFinalActions = ({ sessionName, status }: HostFinalActionsProps) => {
  const reset = useSocketAction(resetSession);
  const end = useSocketAction(endSession);
  const setupExport = useSetupExport();
  const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);
  const errorMessage = useErrorMessage();
  const error = reset.error ?? end.error ?? setupExport.error;
  const isBusy = reset.isPending || end.isPending || status !== "connected";

  return (
    <>
      <Button
        variant="secondary"
        size="stage-sm"
        className="shrink-0"
        disabled={setupExport.isExporting || end.isPending}
        onClick={() => void setupExport.exportSetup(sessionName)}
      >
        <FormattedMessage id={setupExport.isExporting ? "final.exporting" : "final.exportGames"} />
      </Button>
      <div className="flex min-w-0 items-center gap-6">
        {!error && status === "reconnecting" ? (
          <ReconnectingNote status={status} className="min-w-0 text-right" />
        ) : (
          <p role={error ? "alert" : "status"} className="min-w-0 text-right text-stage-caption text-fg-subtle">
            {error && errorMessage(error)}
          </p>
        )}
        <Button
          variant="ghost"
          size="stage-sm"
          className="shrink-0"
          disabled={isBusy}
          onClick={() => setIsConfirmingEnd(true)}
        >
          <FormattedMessage id="final.endSession" />
        </Button>
        <Button size="stage" className="shrink-0" disabled={isBusy} onClick={() => void reset.run()}>
          <FormattedMessage id="final.playAgain" />
        </Button>
      </div>
      <ConfirmDialog
        open={isConfirmingEnd}
        onOpenChange={setIsConfirmingEnd}
        title={<FormattedMessage id="final.endTitle" />}
        description={<FormattedMessage id="final.endBody" />}
        cancelLabel={<FormattedMessage id="final.endCancel" />}
        confirmLabel={<FormattedMessage id="final.endConfirm" />}
        onConfirm={() => void end.run()}
      />
    </>
  );
};
