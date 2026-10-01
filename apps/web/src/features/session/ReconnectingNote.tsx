import { cn } from "@gamemash/ui";
import { FormattedMessage } from "react-intl";
import type { LobbyStatus } from "../../lib/lobby";

const variantClasses = {
  stage: "text-stage-caption",
  phone: "text-caption",
};

export type ReconnectingNoteProps = {
  status: LobbyStatus;
  variant?: keyof typeof variantClasses;
  className?: string;
};

export const ReconnectingNote = ({ status, variant = "stage", className }: ReconnectingNoteProps) =>
  status === "reconnecting" ? (
    <p role="status" className={cn(variantClasses[variant], "text-fg-subtle", className)}>
      <FormattedMessage id="connection.reconnecting" />
    </p>
  ) : null;
