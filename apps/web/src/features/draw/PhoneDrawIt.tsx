import type { DrawItPlayerView } from "@gamemash/games/config";
import type { PlayingSnapshot } from "@gamemash/shared";
import type { PlayerCredentials } from "../../lib/credentials";
import type { LobbyStatus } from "../../lib/lobby";
import type { PlayerIdentity } from "../play/PlayFrame";
import { PhoneDrawing } from "./PhoneDrawing";
import { PhoneDrawResult } from "./PhoneDrawResult";
import { PhoneRating } from "./PhoneRating";

export type PhoneDrawItProps = {
  credentials: PlayerCredentials;
  me: PlayerIdentity;
  snapshot: PlayingSnapshot;
  status: LobbyStatus;
};

export const PhoneDrawIt = ({ credentials, me, snapshot, status }: PhoneDrawItProps) => {
  const view = snapshot.view as DrawItPlayerView;
  if (view.kind === "draw") {
    return (
      <PhoneDrawing
        key={snapshot.phaseId}
        credentials={credentials}
        me={me}
        view={view}
        phaseId={snapshot.phaseId}
        phaseEndsAt={snapshot.phaseEndsAt}
        status={status}
      />
    );
  }
  if (view.kind === "rate") {
    return (
      <PhoneRating
        key={snapshot.phaseId}
        credentials={credentials}
        me={me}
        view={view}
        phaseId={snapshot.phaseId}
        phaseEndsAt={snapshot.phaseEndsAt}
        status={status}
      />
    );
  }
  return <PhoneDrawResult me={me} view={view} status={status} />;
};
