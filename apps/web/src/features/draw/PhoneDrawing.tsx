import {
  DRAW_IT_MAX_FILL_RINGS,
  DRAW_IT_MAX_POINTS,
  DRAW_IT_MAX_STROKES,
  type DrawItPlayerView,
  OWN_DRAWING_ID,
} from "@gamemash/games/config";
import {
  Button,
  compactDrawing,
  type Drawing,
  DrawingCanvas,
  DrawingFrame,
  DrawingToolbar,
  Heading,
  isFill,
  pointCount,
  TimerPill,
  useDrawing,
} from "@gamemash/ui";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import type { PlayerCredentials } from "../../lib/credentials";
import { fetchPlayerDrawing } from "../../lib/drawings";
import { useErrorMessage } from "../../lib/errors";
import type { LobbyStatus } from "../../lib/lobby";
import { playerDrawingKey } from "../../lib/query-keys";
import { useSecondsLabel } from "../game/useSecondsLabel";
import { useSecondsLeft } from "../game/useSecondsLeft";
import { type PlayerIdentity, PlayFrame } from "../play/PlayFrame";
import { PhoneDrawWord } from "./PhoneDrawWord";
import { useDrawingSync } from "./useDrawingSync";
import { useToolbarLabels } from "./useToolbarLabels";

type DrawingView = Extract<DrawItPlayerView, { kind: "draw" }>;

const URGENT_SECONDS = 2;
const PREVIEW_SIZE = 280;

const isOverLimits = (drawing: Drawing) =>
  pointCount(drawing) > DRAW_IT_MAX_POINTS ||
  drawing.strokes.length > DRAW_IT_MAX_STROKES ||
  drawing.strokes.some((mark) => isFill(mark) && mark.rings.length > DRAW_IT_MAX_FILL_RINGS);

export type PhoneDrawingProps = {
  credentials: PlayerCredentials;
  me: PlayerIdentity;
  view: DrawingView;
  phaseId: number;
  phaseEndsAt: number | null;
  status: LobbyStatus;
};

export const PhoneDrawing = ({ credentials, me, view, phaseId, phaseEndsAt, status }: PhoneDrawingProps) => {
  const intl = useIntl();
  const errorMessage = useErrorMessage();
  const labels = useToolbarLabels();
  const secondsLabel = useSecondsLabel();
  const seconds = useSecondsLeft(phaseEndsAt);
  const controller = useDrawing();
  const sync = useDrawingSync(credentials, phaseId);
  const [isRestored, setIsRestored] = useState(false);

  const saved = useQuery({
    queryKey: playerDrawingKey(credentials, phaseId, OWN_DRAWING_ID),
    queryFn: () => fetchPlayerDrawing(credentials, OWN_DRAWING_ID),
    enabled: view.isParticipant,
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  });

  const { isEmpty, load } = controller;
  useEffect(() => {
    if (isRestored || saved.isPending) return;
    if (saved.data && isEmpty) load(saved.data);
    setIsRestored(true);
  }, [isRestored, saved.isPending, saved.data, isEmpty, load]);

  const compacted = useMemo(() => compactDrawing(controller.drawing, DRAW_IT_MAX_POINTS), [controller.drawing]);
  const isTooDetailed = isOverLimits(compacted);
  const isTimeUp = seconds === 0;
  const isUrgent = seconds <= URGENT_SECONDS;
  const isFinished = view.isDone || sync.isDone;
  const { send, flush } = sync;
  const lastSent = useRef(controller.drawing);

  useEffect(() => {
    if (!isRestored || isFinished || isTooDetailed || lastSent.current === controller.drawing) return;
    lastSent.current = controller.drawing;
    send({ done: false, drawing: compacted }, isUrgent);
  }, [controller.drawing, compacted, isRestored, isFinished, isTooDetailed, isUrgent, send]);

  useEffect(() => {
    if (isUrgent) flush();
  }, [isUrgent, flush]);

  const header = (
    <>
      <PhoneDrawWord progress={view} captionId="draw.drawCaption" />
      <TimerPill
        seconds={seconds}
        label={secondsLabel(seconds)}
        tone={isFinished || isTimeUp || !view.isParticipant ? "idle" : "active"}
      />
    </>
  );

  if (!view.isParticipant) {
    return (
      <PlayFrame
        me={me}
        total={view.total}
        status={status}
        header={header}
        mainClassName="items-center justify-center gap-3 text-center"
      >
        <Heading>
          <FormattedMessage id="play.lookUp" />
        </Heading>
        <p className="text-xl text-fg-muted">
          <FormattedMessage id="draw.notThisRound" />
        </p>
      </PlayFrame>
    );
  }

  if (isFinished || isTimeUp) {
    const preview = controller.isEmpty ? (saved.data ?? undefined) : controller.drawing;
    return (
      <PlayFrame
        me={me}
        total={view.total}
        status={status}
        header={header}
        mainClassName="items-center justify-center gap-5 text-center"
      >
        <Heading>
          <FormattedMessage id={isFinished ? "draw.doneTitle" : "play.timeUp"} />
        </Heading>
        {preview && (
          <DrawingFrame drawing={preview} size={PREVIEW_SIZE} label={intl.formatMessage({ id: "draw.yourDrawing" })} />
        )}
        <p className="text-lg text-fg-muted">
          <FormattedMessage id="draw.waiting" />
        </p>
        {sync.error && (
          <p role="alert" className="text-caption font-bold text-danger">
            {errorMessage(sync.error)}
          </p>
        )}
      </PlayFrame>
    );
  }

  const problem = isTooDetailed
    ? intl.formatMessage({ id: "draw.tooDetailed" })
    : sync.error && errorMessage(sync.error);

  return (
    <PlayFrame
      me={me}
      total={view.total}
      status={status}
      header={header}
      mainClassName="gap-3.5"
      bottomAction={
        <Button
          size="lg"
          disabled={!isRestored || isTooDetailed}
          onClick={() => send({ done: true, drawing: compacted })}
        >
          <FormattedMessage id="draw.done" />
        </Button>
      }
    >
      <DrawingCanvas
        controller={controller}
        label={intl.formatMessage({ id: "draw.canvasLabel" }, { word: view.word })}
      />
      <DrawingToolbar
        color={controller.color}
        onColorChange={controller.setColor}
        size={controller.size}
        onSizeChange={controller.setSize}
        tool={controller.tool}
        onToolChange={controller.setTool}
        onUndo={controller.undo}
        onClear={controller.clear}
        canUndo={!controller.isEmpty}
        labels={labels}
      />
      {problem ? (
        <p role="alert" className="text-caption font-bold text-danger">
          {problem}
        </p>
      ) : (
        <p className="text-caption text-fg-subtle">
          <FormattedMessage id="draw.hint" />
        </p>
      )}
    </PlayFrame>
  );
};
