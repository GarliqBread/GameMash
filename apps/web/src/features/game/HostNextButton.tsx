import { Button } from "@gamemash/ui";
import type { ReactNode } from "react";
import { useErrorMessage } from "../../lib/errors";
import { nextPhase } from "../../lib/lobby";
import { useSocketAction } from "./useSocketAction";

export const HostNextButton = ({ phaseId, label }: { phaseId: number; label: ReactNode }) => {
  const { run, isPending, error } = useSocketAction(nextPhase);
  const errorMessage = useErrorMessage();
  return (
    <>
      {error && (
        <p role="alert" className="text-stage-caption text-fg-subtle">
          {errorMessage(error)}
        </p>
      )}
      <Button size="stage-sm" className="shrink-0" disabled={isPending} onClick={() => void run(phaseId)}>
        {label}
      </Button>
    </>
  );
};
