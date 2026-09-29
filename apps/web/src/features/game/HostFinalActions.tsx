import type { ApiError } from "@gamemash/shared";
import { Button, ConfirmDialog } from "@gamemash/ui";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { toApiError, useErrorMessage } from "../../lib/errors";
import { endSession, type LobbyStatus, resetSession } from "../../lib/lobby";
import { downloadSetupFile } from "../../lib/setup";
import { useHostCredentials } from "../host/host-credentials";
import { useSocketAction } from "./useSocketAction";

export type HostFinalActionsProps = {
  sessionName: string;
  status: LobbyStatus;
};

export const HostFinalActions = ({ sessionName, status }: HostFinalActionsProps) => {
  const credentials = useHostCredentials();
  const reset = useSocketAction(resetSession);
  const end = useSocketAction(endSession);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<ApiError | null>(null);
  const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);
  const errorMessage = useErrorMessage();
  const error = reset.error ?? end.error ?? exportError;
  const isBusy = reset.isPending || end.isPending || status !== "connected";

  const exportGames = async () => {
    setExportError(null);
    setIsExporting(true);
    try {
      await downloadSetupFile(credentials, sessionName);
    } catch (caught) {
      setExportError(toApiError(caught));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        size="stage-sm"
        className="shrink-0"
        disabled={isExporting || end.isPending}
        onClick={() => void exportGames()}
      >
        <FormattedMessage id={isExporting ? "final.exporting" : "final.exportGames"} />
      </Button>
      <div className="flex min-w-0 items-center gap-6">
        <p role={error ? "alert" : "status"} className="min-w-0 text-right text-stage-caption text-fg-subtle">
          {error ? errorMessage(error) : status === "reconnecting" && <FormattedMessage id="connection.reconnecting" />}
        </p>
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
