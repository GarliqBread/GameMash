import type { DrawingUpload } from "@gamemash/games/schemas";
import type { ApiError } from "@gamemash/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerCredentials } from "../../lib/credentials";
import { uploadDrawing } from "../../lib/drawings";
import { toApiError } from "../../lib/errors";

const MIN_INTERVAL_MS = 700;
const RETRY_MS = 2000;
const FINAL_ERRORS = new Set<ApiError["code"]>(["input_closed", "bad_request", "unauthorized", "payload_too_large"]);

type Queued = { upload: DrawingUpload; isUrgent: boolean };

export const useDrawingSync = (credentials: PlayerCredentials, phaseId: number) => {
  const pending = useRef<Queued | null>(null);
  const isSending = useRef(false);
  const lastSentAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isDoneLocked = useRef(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [isDone, setIsDone] = useState(false);

  const pump = useCallback(async () => {
    const next = pending.current;
    if (isSending.current || !next) return;
    const wait = lastSentAt.current + MIN_INTERVAL_MS - Date.now();
    if (wait > 0 && !next.isUrgent) {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = undefined;
        void pump();
      }, wait);
      return;
    }
    clearTimeout(timer.current);
    timer.current = undefined;
    pending.current = null;
    isSending.current = true;
    lastSentAt.current = Date.now();
    try {
      await uploadDrawing(credentials, phaseId, next.upload);
      setError(null);
    } catch (caught) {
      const failure = toApiError(caught);
      setError(failure);
      if (!FINAL_ERRORS.has(failure.code) && pending.current === null) {
        pending.current = next;
        timer.current = setTimeout(() => {
          timer.current = undefined;
          void pump();
        }, RETRY_MS);
      }
    } finally {
      isSending.current = false;
      if (!timer.current) void pump();
    }
  }, [credentials, phaseId]);

  const send = useCallback(
    (upload: DrawingUpload, isUrgent = false) => {
      if (isDoneLocked.current) return;
      if (upload.done) {
        isDoneLocked.current = true;
        setIsDone(true);
      }
      pending.current = { upload, isUrgent: isUrgent || upload.done };
      void pump();
    },
    [pump],
  );

  const flush = useCallback(() => {
    if (!pending.current) return;
    pending.current = { ...pending.current, isUrgent: true };
    void pump();
  }, [pump]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { send, flush, error, isDone };
};
