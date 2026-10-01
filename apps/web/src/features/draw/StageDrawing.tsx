import type { DrawItStageView } from "@gamemash/games/config";
import type { LobbyPlayer } from "@gamemash/shared";
import {
  CountStat,
  PlayerChip,
  PlayerGrid,
  StageLayout,
  StageViewport,
  TIMER_WARNING_SECONDS,
  TimerRing,
  WordCard,
} from "@gamemash/ui";
import { FormattedMessage, useIntl } from "react-intl";
import type { LobbyStatus } from "../../lib/lobby";
import { avatarSrc } from "../../lib/players";
import { useSecondsLabel } from "../game/useSecondsLabel";
import { useSecondsLeft } from "../game/useSecondsLeft";
import { useHostCredentials } from "../host/host-credentials";
import { ReconnectingNote } from "../session/ReconnectingNote";
import { DrawStageHeader } from "./DrawStageHeader";
import { roundValues } from "./round-values";

type DrawingView = Extract<DrawItStageView, { kind: "draw" }>;

const CHIP_COLUMNS = 9;
const MAX_CHIPS = CHIP_COLUMNS * 2;

export type StageDrawingProps = {
  view: DrawingView;
  players: Map<string, LobbyPlayer>;
  phaseEndsAt: number | null;
  status: LobbyStatus;
};

export const StageDrawing = ({ view, players, phaseEndsAt, status }: StageDrawingProps) => {
  const intl = useIntl();
  const { sessionId } = useHostCredentials();
  const seconds = useSecondsLeft(phaseEndsAt);
  const secondsLabel = useSecondsLabel();
  const done = new Set(view.doneIds);
  const artists = view.participantIds.flatMap((playerId) => {
    const player = players.get(playerId);
    return player ? [player] : [];
  });
  const hasOverflow = artists.length > MAX_CHIPS;
  const shown = hasOverflow ? artists.slice(0, MAX_CHIPS - 1) : artists;

  return (
    <StageViewport>
      <StageLayout
        mainClassName="items-center justify-center gap-9"
        header={
          <DrawStageHeader
            progress={<FormattedMessage id="draw.stageRound" values={roundValues(view)} />}
            right={
              <TimerRing
                seconds={seconds}
                total={view.drawSeconds}
                label={secondsLabel(seconds)}
                warningLabel={secondsLabel(TIMER_WARNING_SECONDS)}
              />
            }
          />
        }
        footer={
          <div className="flex w-full flex-col gap-[18px]">
            <CountStat
              layout="inline"
              size="md"
              value={
                <FormattedMessage
                  id="draw.finishedCount"
                  values={{ done: view.doneIds.length, total: view.participantIds.length }}
                />
              }
              caption={<FormattedMessage id="draw.finishedDrawing" />}
            />
            <PlayerGrid columns={CHIP_COLUMNS} className="gap-x-3.5">
              {shown.map((player) => (
                <PlayerChip
                  key={player.id}
                  state={done.has(player.id) ? "done" : "drawing"}
                  name={player.name}
                  colorKey={player.id}
                  avatarSrc={avatarSrc(sessionId, player)}
                  statusLabel={intl.formatMessage({ id: done.has(player.id) ? "draw.chipDone" : "draw.chipDrawing" })}
                />
              ))}
              {hasOverflow && (
                <PlayerChip
                  state="drawing"
                  name={intl.formatMessage({ id: "lobby.morePlayers" }, { count: artists.length - shown.length })}
                  statusLabel={intl.formatMessage({ id: "draw.chipDrawing" })}
                />
              )}
            </PlayerGrid>
            <ReconnectingNote status={status} />
          </div>
        }
      >
        <span className="text-stage-xl text-fg-muted">
          <FormattedMessage id="draw.everyoneDraw" />
        </span>
        <WordCard as="h1" className="max-w-[1500px] text-center hyphens-auto wrap-break-word">
          {view.word}
        </WordCard>
        <span className="mt-3 text-stage-body text-fg-subtle">
          <FormattedMessage id="draw.stageHint" />
        </span>
      </StageLayout>
    </StageViewport>
  );
};
