import { DRAW_IT_RATING_MAX, type DrawItPlayerView } from "@gamemash/games/config";
import { Heading, Pill } from "@gamemash/ui";
import { FormattedMessage } from "react-intl";
import type { LobbyStatus } from "../../lib/lobby";
import { type PlayerIdentity, PlayFrame } from "../play/PlayFrame";
import { PhoneDrawWord } from "./PhoneDrawWord";

type ResultsView = Extract<DrawItPlayerView, { kind: "results" }>;

export type PhoneDrawResultProps = {
  me: PlayerIdentity;
  view: ResultsView;
  status: LobbyStatus;
};

export const PhoneDrawResult = ({ me, view, status }: PhoneDrawResultProps) => {
  const { result } = view;
  return (
    <PlayFrame
      me={me}
      total={view.total}
      status={status}
      header={<PhoneDrawWord progress={view} captionId="draw.resultsCaption" />}
      mainClassName="items-center justify-center gap-5 text-center"
    >
      {result ? (
        <>
          <Heading>
            <FormattedMessage id="draw.resultPlace" values={{ rank: result.rank }} />
          </Heading>
          {result.average === null ? (
            <p className="text-xl text-fg-muted">
              <FormattedMessage id="draw.noRatings" />
            </p>
          ) : (
            <>
              <p className="font-display text-3xl font-extrabold">
                <FormattedMessage
                  id="draw.resultAverage"
                  values={{ average: result.average, max: DRAW_IT_RATING_MAX }}
                />
              </p>
              <Pill variant="accent" size="phone">
                <FormattedMessage id="play.pointsGained" values={{ points: result.points }} />
              </Pill>
            </>
          )}
        </>
      ) : (
        <Heading>
          <FormattedMessage id="draw.noDrawing" />
        </Heading>
      )}
      <p className="text-lg text-fg-muted">
        <FormattedMessage id="draw.seeBigScreen" />
      </p>
    </PlayFrame>
  );
};
