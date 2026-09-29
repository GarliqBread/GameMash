import { SETUP_FILE_CONTENT_TYPE, SETUP_FILE_EXTENSION } from "@gamemash/shared";
import { DownloadIcon, ToolButton, UploadIcon, WorkingDialog } from "@gamemash/ui";
import { type ChangeEvent, useRef } from "react";
import { FormattedMessage } from "react-intl";
import { useErrorMessage } from "../../lib/errors";
import type { useSetupTransfer } from "./useSetupTransfer";

type Transfer = ReturnType<typeof useSetupTransfer>;

const ACCEPT = `.${SETUP_FILE_EXTENSION},${SETUP_FILE_CONTENT_TYPE}`;

export const SetupTransferButtons = ({ transfer, canExport }: { transfer: Transfer; canExport: boolean }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isBusy = transfer.isImporting || transfer.isExporting;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files ?? [];
    event.target.value = "";
    if (file) void transfer.importFile(file);
  };

  return (
    <>
      <ToolButton
        icon={<DownloadIcon size={18} strokeWidth={2.2} />}
        disabled={isBusy || !canExport}
        onClick={() => void transfer.exportFile()}
      >
        <FormattedMessage id="setup.export" />
      </ToolButton>
      <ToolButton
        icon={<UploadIcon size={18} strokeWidth={2.2} />}
        disabled={isBusy}
        onClick={() => inputRef.current?.click()}
      >
        <FormattedMessage id="setup.import" />
      </ToolButton>
      <input ref={inputRef} type="file" accept={ACCEPT} hidden onChange={handleChange} />
      <WorkingDialog open={transfer.isImporting} title={<FormattedMessage id="setup.importing" />} />
    </>
  );
};

export const SetupTransferStatus = ({ transfer }: { transfer: Transfer }) => {
  const formatError = useErrorMessage();
  const { problem, addedGames } = transfer;
  if (problem) {
    return (
      <p role="alert" className="font-bold text-danger">
        {problem.kind === "tooLarge" && <FormattedMessage id="setup.importTooLarge" values={{ max: problem.maxMb }} />}
        {problem.kind === "exportFailed" &&
          (problem.error.code === "internal_error" ? (
            <FormattedMessage id="setup.exportFailed" />
          ) : (
            formatError(problem.error)
          ))}
        {problem.kind === "importFailed" && formatError(problem.error)}
      </p>
    );
  }
  if (addedGames === null) return null;
  return (
    <p role="status" className="font-bold text-success-ink">
      <FormattedMessage id="setup.imported" values={{ count: addedGames }} />
    </p>
  );
};
