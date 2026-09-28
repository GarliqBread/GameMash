import { FormattedMessage } from "react-intl";
import type { LobbyStatus } from "../../lib/lobby";

export const ReconnectingNote = ({ status }: { status: LobbyStatus }) =>
  status === "reconnecting" ? (
    <p role="status" className="text-stage-caption text-fg-subtle">
      <FormattedMessage id="connection.reconnecting" />
    </p>
  ) : null;
