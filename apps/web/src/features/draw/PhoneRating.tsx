import { DRAW_IT_RATING_MAX, DRAW_IT_RATING_MIN, type DrawItPlayerView } from "@gamemash/games/config";
import { Button, DrawingFrame, Heading, RatingScale, TimerPill } from "@gamemash/ui";
import { useQueries } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import type { PlayerCredentials } from "../../lib/credentials";
import { fetchPlayerDrawing } from "../../lib/drawings";
import { useErrorMessage } from "../../lib/errors";
import { type LobbyStatus, submitInput } from "../../lib/lobby";
import { playerDrawingKey } from "../../lib/query-keys";
import { useSecondsLabel } from "../game/useSecondsLabel";
import { useSecondsLeft } from "../game/useSecondsLeft";
import { useSocketAction } from "../game/useSocketAction";
import { type PlayerIdentity, PlayFrame } from "../play/PlayFrame";
import { PhoneDrawWord } from "./PhoneDrawWord";

type RatingView = Extract<DrawItPlayerView, { kind: "rate" }>;

const MOVE_ON_MS = 350;
const FRAME_SIZE = 300;

export type PhoneRatingProps = {
  credentials: PlayerCredentials;
  me: PlayerIdentity;
  view: RatingView;
  phaseId: number;
  phaseEndsAt: number | null;
  status: LobbyStatus;
};

const firstUnrated = (ids: string[], ratings: Record<string, number>) =>
  Math.max(
    0,
    ids.findIndex((id) => ratings[id] === undefined),
  );

export const PhoneRating = ({ credentials, me, view, phaseId, phaseEndsAt, status }: PhoneRatingProps) => {
  const intl = useIntl();
  const errorMessage = useErrorMessage();
  const secondsLabel = useSecondsLabel();
  const seconds = useSecondsLeft(phaseEndsAt);
  const rate = useSocketAction(submitInput);
  const [ratings, setRatings] = useState<Record<string, number>>(view.mine);
  const [index, setIndex] = useState(() => firstUnrated(view.toRate, view.mine));
  const moveOn = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const drawings = useQueries({
    queries: view.toRate.map((drawingId) => ({
      queryKey: playerDrawingKey(credentials, phaseId, drawingId),
      queryFn: () => fetchPlayerDrawing(credentials, drawingId),
      staleTime: Number.POSITIVE_INFINITY,
    })),
  });

  useEffect(() => () => clearTimeout(moveOn.current), []);

  const drawingId = view.toRate[index];
  const rating = drawingId ? ratings[drawingId] : undefined;
  const ratedCount = view.toRate.filter((id) => ratings[id] !== undefined).length;
  const isAllRated = ratedCount === view.toRate.length;
  const isTimeUp = seconds === 0;

  const header = (
    <>
      <PhoneDrawWord progress={view} captionId="draw.rateCaption" />
      <TimerPill
        seconds={seconds}
        label={secondsLabel(seconds)}
        tone={isAllRated || isTimeUp || !view.isParticipant ? "idle" : "active"}
      />
    </>
  );

  if (!view.isParticipant || !drawingId || isTimeUp) {
    return (
      <PlayFrame
        me={me}
        total={view.total}
        status={status}
        header={header}
        mainClassName="items-center justify-center gap-3 text-center"
      >
        <Heading>
          <FormattedMessage id={isTimeUp ? "play.timeUp" : "play.lookUp"} />
        </Heading>
        <p className="text-xl text-fg-muted">
          <FormattedMessage id={isTimeUp ? "draw.resultsSoon" : "draw.notRating"} />
        </p>
      </PlayFrame>
    );
  }

  const onRate = (value: number) => {
    const isFirstRating = ratings[drawingId] === undefined;
    const next = { ...ratings, [drawingId]: value };
    setRatings(next);
    void rate.run(phaseId, next);
    clearTimeout(moveOn.current);
    const nextUnrated = view.toRate.findIndex((id, position) => position > index && next[id] === undefined);
    if (isFirstRating && nextUnrated !== -1) moveOn.current = setTimeout(() => setIndex(nextUnrated), MOVE_ON_MS);
  };

  const go = (step: number) => {
    clearTimeout(moveOn.current);
    setIndex((current) => Math.min(view.toRate.length - 1, Math.max(0, current + step)));
  };

  const drawing = drawings[index]?.data ?? undefined;

  return (
    <PlayFrame me={me} total={view.total} status={status} header={header} mainClassName="gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-xl font-extrabold">
          <FormattedMessage id="draw.drawingPosition" values={{ current: index + 1, total: view.toRate.length }} />
        </span>
        <span className="text-caption text-fg-subtle">
          <FormattedMessage id="draw.ratedCount" values={{ rated: ratedCount, total: view.toRate.length }} />
        </span>
      </div>
      <DrawingFrame
        key={drawingId}
        drawing={drawing}
        size={FRAME_SIZE}
        className="self-center"
        label={intl.formatMessage({ id: "draw.drawingLabel" }, { position: index + 1 })}
      />
      <RatingScale
        aria-label={intl.formatMessage({ id: "draw.ratingLabel" })}
        value={rating ?? null}
        onValueChange={onRate}
        lowLabel={<FormattedMessage id="draw.ratingLow" values={{ min: DRAW_IT_RATING_MIN }} />}
        highLabel={<FormattedMessage id="draw.ratingHigh" values={{ max: DRAW_IT_RATING_MAX }} />}
      />
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" disabled={index === 0} onClick={() => go(-1)}>
          <FormattedMessage id="draw.previous" />
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          disabled={index === view.toRate.length - 1}
          onClick={() => go(1)}
        >
          <FormattedMessage id="draw.next" />
        </Button>
      </div>
      <p role="status" className="text-caption text-fg-subtle">
        {rate.error ? (
          <span className="font-bold text-danger">{errorMessage(rate.error)}</span>
        ) : (
          <FormattedMessage
            id={isAllRated ? "draw.allRated" : rating === undefined ? "draw.howGood" : "draw.youGave"}
            values={{ rating: rating ?? 0 }}
          />
        )}
      </p>
    </PlayFrame>
  );
};
