import type { DrawItPlayerView } from "@gamemash/games/config";
import type { PhoneGameProps } from "../games/game-views";
import { PhoneDrawing } from "./PhoneDrawing";
import { PhoneDrawResult } from "./PhoneDrawResult";
import { PhoneRating } from "./PhoneRating";

export const PhoneDrawIt = ({ credentials, me, snapshot, view, status }: PhoneGameProps<DrawItPlayerView>) => {
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
