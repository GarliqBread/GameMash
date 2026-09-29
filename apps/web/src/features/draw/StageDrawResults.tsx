import {
  DRAW_IT_POINTS_PER_RATING_POINT,
  DRAW_IT_RATING_MAX,
  type DrawItResultEntry,
  type DrawItStageView,
} from "@gamemash/games/config";
import type { LobbyPlayer } from "@gamemash/shared";
import { DrawingResultCard, DrawingResultChip, Heading, StageLayout, StageViewport } from "@gamemash/ui";
import type { ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import type { LobbyStatus } from "../../lib/lobby";
import { useSecondsLeft } from "../game/useSecondsLeft";
import { ReconnectingNote } from "../session/ReconnectingNote";
import { DrawStageHeader, roundValues } from "./stage-display";
import { useHostDrawings } from "./useHostDrawings";

type ResultsView = Extract<DrawItStageView, { kind: "results" }>;

const CARD_COUNT = 3;
const CHIP_COUNT = 6;
const EMPTY_DRAWING = { strokes: [] };

export type StageDrawResultsProps = {
  roundKey: string;
  view: ResultsView;
  players: Map<string, LobbyPlayer>;
  phaseEndsAt: number | null;
  nextLabelId: string;
  next: ReactNode;
  status: LobbyStatus;
};

const isPodiumRank = (rank: number): rank is 1 | 2 | 3 => rank >= 1 && rank <= CARD_COUNT;

export const StageDrawResults = ({
  roundKey,
  view,
  players,
  phaseEndsAt,
  nextLabelId,
  next,
  status,
}: StageDrawResultsProps) => {
  const intl = useIntl();
  const seconds = useSecondsLeft(phaseEndsAt);
  const shown = view.entries.slice(0, CARD_COUNT + CHIP_COUNT);
  const drawings = useHostDrawings(
    roundKey,
    shown.map((entry) => entry.drawingId),
  );
  const cards = shown.filter((entry, position) => position < CARD_COUNT && isPodiumRank(entry.rank));
  const chips = shown.filter((entry) => !cards.includes(entry));

  const nameOf = (entry: DrawItResultEntry) =>
    players.get(entry.playerId)?.name ?? intl.formatMessage({ id: "draw.unknownPlayer" });
  const averageOf = (entry: DrawItResultEntry) =>
    entry.average === null
      ? intl.formatMessage({ id: "draw.unrated" })
      : intl.formatNumber(entry.average, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const drawingOf = (entry: DrawItResultEntry) => drawings.get(entry.drawingId) ?? EMPTY_DRAWING;
  const labelOf = (entry: DrawItResultEntry) => intl.formatMessage({ id: "draw.drawingBy" }, { name: nameOf(entry) });

  return (
    <StageViewport>
      <StageLayout
        className="gap-8"
        mainClassName="gap-7"
        header={
          <DrawStageHeader
            progress={<FormattedMessage id="draw.resultsRound" values={roundValues(view)} />}
            right={
              <span className="text-stage-body text-fg-subtle">
                <FormattedMessage
                  id="draw.resultsStats"
                  values={{ drawings: view.entries.length, ratings: view.ratingCount }}
                />
              </span>
            }
          />
        }
        footer={
          <>
            {status === "reconnecting" ? (
              <ReconnectingNote status={status} />
            ) : (
              <span className="text-stage-body text-fg-muted">
                <FormattedMessage id="draw.pointsRule" values={{ points: DRAW_IT_POINTS_PER_RATING_POINT }} />
              </span>
            )}
            <div className="flex shrink-0 items-center gap-6">
              <span className="text-stage-caption text-fg-subtle">
                <FormattedMessage id={nextLabelId} values={{ seconds }} />
              </span>
              {next}
            </div>
          </>
        }
      >
        <Heading size="stage-title" className="hyphens-auto wrap-break-word">
          <FormattedMessage
            id={view.entries.length === 0 ? "draw.noDrawingsTitle" : "draw.bestIs"}
            values={{ word: view.word }}
          />
        </Heading>
        {cards.length > 0 && (
          <ol className="grid grid-cols-3 gap-8">
            {cards.map((entry) => (
              <DrawingResultCard
                key={entry.drawingId}
                rank={isPodiumRank(entry.rank) ? entry.rank : 3}
                name={nameOf(entry)}
                drawing={drawingOf(entry)}
                drawingLabel={labelOf(entry)}
                average={averageOf(entry)}
                outOf={<FormattedMessage id="draw.outOf" values={{ max: DRAW_IT_RATING_MAX }} />}
                points={<FormattedMessage id="draw.pointsPill" values={{ points: entry.points }} />}
              />
            ))}
          </ol>
        )}
        {chips.length > 0 && (
          <ol className="grid grid-cols-6 gap-5">
            {chips.map((entry) => (
              <DrawingResultChip
                key={entry.drawingId}
                rank={<FormattedMessage id="draw.rankChip" values={{ rank: entry.rank }} />}
                name={nameOf(entry)}
                drawing={drawingOf(entry)}
                drawingLabel={labelOf(entry)}
                average={averageOf(entry)}
              />
            ))}
          </ol>
        )}
      </StageLayout>
    </StageViewport>
  );
};
