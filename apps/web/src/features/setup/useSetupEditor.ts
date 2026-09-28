import type { SessionSetup } from "@gamemash/games/config";
import type { ApiError } from "@gamemash/shared";
import type { AutosaveStatus } from "@gamemash/ui";
import { useEffect, useRef, useState } from "react";
import type { HostCredentials } from "../../lib/credentials";
import { toApiError } from "../../lib/errors";
import { saveSetup } from "../../lib/setup";

const SAVE_DELAY_MS = 800;

export const useSetupEditor = (credentials: HostCredentials, initialSetup: SessionSetup) => {
  const [setup, setSetup] = useState(initialSetup);
  const [status, setStatus] = useState<AutosaveStatus>("saved");
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const latest = useRef(initialSetup);
  const pending = useRef<SessionSetup | null>(null);
  const isSaving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));

  const saveNext = async () => {
    const next = pending.current;
    if (!next) return true;
    pending.current = null;
    isSaving.current = true;
    try {
      await saveSetup(credentials, next);
      setSaveError(null);
      return true;
    } catch (error) {
      pending.current ??= next;
      setSaveError(toApiError(error));
      return false;
    } finally {
      isSaving.current = false;
    }
  };

  const flush = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    queue.current = queue.current.then(saveNext).then((isSaved) => {
      if (!isSaved) setStatus(timer.current ? "saving" : "error");
      else if (!pending.current) setStatus("saved");
      return isSaved;
    });
    return queue.current;
  };

  const update = (change: (current: SessionSetup) => SessionSetup) => {
    const next = change(latest.current);
    latest.current = next;
    pending.current = next;
    setSetup(next);
    setStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
  };

  const flushRef = useRef(flush);
  flushRef.current = flush;

  useEffect(() => {
    const hasUnsavedChanges = () => pending.current !== null || isSaving.current;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) event.preventDefault();
    };
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden" && hasUnsavedChanges()) void flushRef.current();
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    document.addEventListener("visibilitychange", saveWhenHidden);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeLeaving);
      document.removeEventListener("visibilitychange", saveWhenHidden);
      void flushRef.current();
    };
  }, []);

  return { setup, status, saveError, update, flush };
};
