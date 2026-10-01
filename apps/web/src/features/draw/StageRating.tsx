import { DRAW_IT_RATING_MAX, DRAW_IT_RATING_MIN, type DrawItStageView } from "@gamemash/games/config";
import {
  CountStat,
  DrawingFrame,
  EyeOffIcon,
  Heading,
  ProgressDots,
  RatingScalePreview,
  StageLayout,
  StageNote,
  StageViewport,
  TIMER_WARNING_SECONDS,
  TimerRing,
} from "@gamemash/ui";
import { useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import type { LobbyStatus } from "../../lib/lobby";
import { useSecondsLabel } from "../game/useSecondsLabel";
import { useSecondsLeft } from "../game/useSecondsLeft";
import { ReconnectingNote } from "../session/ReconnectingNote";
import { DrawStageHeader } from "./DrawStageHeader";
import { roundValues } from "./round-values";
import { useHostDrawings } from "./useHostDrawings";

type RatingView = Extract<DrawItStageView, { kind: "rate" }>;

const CYCLE_MS = 4000;
const MAX_DOTS = 15;
const FRAME_SIZE = 860;

export type StageRatingProps = {
  roundKey: string;
  view: RatingView;
  phaseEndsAt: number | null;
  status: LobbyStatus;
};

export const StageRating = ({ roundKey, view, phaseEndsAt, status }: StageRatingProps) => {
  const intl = useIntl();
  const seconds = useSecondsLeft(phaseEndsAt);
  const secondsLabel = useSecondsLabel();
  const [index, setIndex] = useState(0);
  const count = view.drawingIds.length;

  useEffect(() => {
    if (count < 2) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % count), CYCLE_MS);
    return () => clearInterval(timer);
  }, [count]);

  const drawingId = view.drawingIds[index] ?? "";
  const upcoming = view.drawingIds[(index + 1) % Math.max(count, 1)] ?? "";
  const drawings = useHostDrawings(roundKey, [...new Set([drawingId, upcoming])]);
  const position = index + 1;

  return (
    <StageViewport>
      <StageLayout
        className="gap-8"
        mainClassName="flex-row gap-[72px]"
        header={
          <DrawStageHeader
            progress={<FormattedMessage id="draw.stageRating" values={roundValues(view)} />}
            right={
              <>
                <span className="text-stage-body font-bold">
                  <FormattedMessage id="draw.stageDrawingOf" values={{ current: position, total: count }} />
                </span>
                {count <= MAX_DOTS && <ProgressDots total={count} current={position} />}
              </>
            }
          />
        }
        footer={status === "reconnecting" ? <ReconnectingNote status={status} /> : undefined}
      >
        <DrawingFrame
          key={drawingId}
          drawing={drawings.get(drawingId)}
          label={intl.formatMessage({ id: "draw.drawingLabel" }, { position })}
          size={FRAME_SIZE}
          className="rounded-panel shadow-card-stage motion-safe:animate-pop-in"
        />
        <section className="flex min-w-0 flex-1 flex-col justify-center gap-10">
          <div className="flex flex-col">
            <span className="text-stage-lg text-fg-subtle">
              <FormattedMessage id="draw.drawingWord" />
            </span>
            <span className="font-display text-stage-word/[0.9] font-extrabold tracking-display-tight">
              <FormattedMessage id="draw.drawingNumber" values={{ position }} />
            </span>
          </div>
          <Heading size="stage-sub">
            <FormattedMessage id="draw.rateOnPhone" values={{ min: DRAW_IT_RATING_MIN, max: DRAW_IT_RATING_MAX }} />
          </Heading>
          <RatingScalePreview />
          <StageNote icon={<EyeOffIcon size={34} />}>
            <FormattedMessage id="draw.namesHidden" />
          </StageNote>
          <div className="mt-3 flex items-center gap-7">
            <TimerRing
              size={112}
              seconds={seconds}
              total={view.rateSeconds}
              label={secondsLabel(seconds)}
              warningLabel={secondsLabel(TIMER_WARNING_SECONDS)}
            />
            <CountStat
              align="start"
              size="md"
              value={view.finishedCount}
              total={view.participantCount}
              caption={<FormattedMessage id="draw.finishedRating" />}
            />
          </div>
        </section>
      </StageLayout>
    </StageViewport>
  );
};
