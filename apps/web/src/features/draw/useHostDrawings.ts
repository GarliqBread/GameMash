import type { Drawing } from "@gamemash/ui";
import { useQueries } from "@tanstack/react-query";
import { fetchHostDrawing } from "../../lib/drawings";
import { useHostCredentials } from "../host/host-credentials";

export const useHostDrawings = (roundKey: string, drawingIds: string[]) => {
  const credentials = useHostCredentials();
  const results = useQueries({
    queries: drawingIds.map((drawingId) => ({
      queryKey: ["drawing", credentials.sessionId, "host", roundKey, drawingId],
      queryFn: () => fetchHostDrawing(credentials, drawingId),
      staleTime: Number.POSITIVE_INFINITY,
    })),
  });
  return new Map<string, Drawing | undefined>(
    drawingIds.map((drawingId, index) => [drawingId, results[index]?.data ?? undefined]),
  );
};
