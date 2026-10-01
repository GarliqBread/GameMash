import type { ApiError } from "@gamemash/shared";
import { useState } from "react";
import { toApiError } from "../../lib/errors";
import { downloadSetupFile } from "../../lib/setup";
import { useHostCredentials } from "../host/host-credentials";

export const useSetupExport = () => {
  const credentials = useHostCredentials();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const exportSetup = async (sessionName: string, prepare?: () => Promise<boolean>) => {
    setError(null);
    setIsExporting(true);
    try {
      if (prepare && !(await prepare())) return;
      await downloadSetupFile(credentials, sessionName);
    } catch (caught) {
      setError(toApiError(caught));
    } finally {
      setIsExporting(false);
    }
  };

  return { exportSetup, isExporting, error, clearError: () => setError(null) };
};
