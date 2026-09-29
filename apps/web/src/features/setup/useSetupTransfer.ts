import type { SessionSetup, SetupImportResponse } from "@gamemash/games/config";
import { type ApiError, SETUP_IMPORT_MAX_BYTES } from "@gamemash/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { HostCredentials } from "../../lib/credentials";
import { toApiError } from "../../lib/errors";
import { downloadSetupFile, importSetupFile } from "../../lib/setup";
import { sessionImagesKey } from "../quiz/useQuestionImages";

const BYTES_PER_MB = 1024 * 1024;

export type TransferProblem =
  | { kind: "tooLarge"; maxMb: number }
  | { kind: "exportFailed"; error: ApiError }
  | { kind: "importFailed"; error: ApiError };

export type SetupTransferOptions = {
  credentials: HostCredentials;
  setup: SessionSetup;
  flush: () => Promise<boolean>;
  replace: (setup: SessionSetup) => void;
  onImported: (result: SetupImportResponse) => void;
};

export const useSetupTransfer = ({ credentials, setup, flush, replace, onImported }: SetupTransferOptions) => {
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [problem, setProblem] = useState<TransferProblem | null>(null);
  const [addedGames, setAddedGames] = useState<number | null>(null);

  const exportFile = async () => {
    setProblem(null);
    setAddedGames(null);
    setIsExporting(true);
    try {
      if (!(await flush())) return;
      await downloadSetupFile(credentials, setup.name);
    } catch (caught) {
      setProblem({ kind: "exportFailed", error: toApiError(caught) });
    } finally {
      setIsExporting(false);
    }
  };

  const importFile = async (file: File) => {
    setProblem(null);
    setAddedGames(null);
    if (file.size > SETUP_IMPORT_MAX_BYTES) {
      setProblem({ kind: "tooLarge", maxMb: SETUP_IMPORT_MAX_BYTES / BYTES_PER_MB });
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
      setProblem({ kind: "importFailed", error: toApiError(caught) });
    } finally {
      setIsImporting(false);
    }
  };

  return { exportFile, importFile, isImporting, isExporting, problem, addedGames };
};
