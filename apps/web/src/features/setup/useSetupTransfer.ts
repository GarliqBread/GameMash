import type { SessionSetup, SetupImportResponse } from "@gamemash/games/config";
import { type ApiError, SETUP_IMPORT_MAX_BYTES } from "@gamemash/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { HostCredentials } from "../../lib/credentials";
import { toApiError } from "../../lib/errors";
import { sessionImagesKey } from "../../lib/query-keys";
import { importSetupFile } from "../../lib/setup";
import { useSetupExport } from "./useSetupExport";

const BYTES_PER_MB = 1024 * 1024;

type TransferProblem =
  | { kind: "tooLarge"; maxMb: number }
  | { kind: "exportFailed"; error: ApiError }
  | { kind: "importFailed"; error: ApiError };

type SetupTransferOptions = {
  credentials: HostCredentials;
  setup: SessionSetup;
  flush: () => Promise<boolean>;
  replace: (setup: SessionSetup) => void;
  onImported: (result: SetupImportResponse) => void;
};

export const useSetupTransfer = ({ credentials, setup, flush, replace, onImported }: SetupTransferOptions) => {
  const queryClient = useQueryClient();
  const setupExport = useSetupExport(credentials);
  const [isImporting, setIsImporting] = useState(false);
  const [importProblem, setImportProblem] = useState<TransferProblem | null>(null);
  const [addedGames, setAddedGames] = useState<number | null>(null);
  const problem: TransferProblem | null =
    importProblem ?? (setupExport.error && { kind: "exportFailed", error: setupExport.error });

  const exportFile = async () => {
    setImportProblem(null);
    setAddedGames(null);
    await setupExport.exportSetup(setup.name, flush);
  };

  const importFile = async (file: File) => {
    setImportProblem(null);
    setupExport.clearError();
    setAddedGames(null);
    if (file.size > SETUP_IMPORT_MAX_BYTES) {
      setImportProblem({ kind: "tooLarge", maxMb: SETUP_IMPORT_MAX_BYTES / BYTES_PER_MB });
      return;
    }
    setIsImporting(true);
    try {
      if (!(await flush())) return;
      const result = await importSetupFile(credentials, file);
      replace(result.setup);
      await queryClient.invalidateQueries({ queryKey: sessionImagesKey(credentials.sessionId) });
      setAddedGames(result.addedGames);
      onImported(result);
    } catch (caught) {
      setImportProblem({ kind: "importFailed", error: toApiError(caught) });
    } finally {
      setIsImporting(false);
    }
  };

  return { exportFile, importFile, isImporting, isExporting: setupExport.isExporting, problem, addedGames };
};
