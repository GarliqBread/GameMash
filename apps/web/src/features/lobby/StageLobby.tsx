import { gameDefinition, isGameId } from "@gamemash/games";
import type { LineupEntry, LobbyPlayer } from "@gamemash/shared";
import {
  Button,
  buttonVariants,
  ConfirmDialog,
  cn,
  GameChip,
  Heading,
  JoinSteps,
  Logo,
  Pill,
  PlayerChip,
  PlayerGrid,
  PlayerRosterDialog,
  QrCode,
  RoomCodeDisplay,
  StageLayout,
  StagePanel,
  StageViewport,
  spellOut,
  TrustNote,
} from "@gamemash/ui";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import type { LobbyStatus } from "../../lib/lobby";
import { avatarSrc } from "../../lib/players";
import { displayHost, joinUrl } from "../../lib/public-url";
import { lobbySlots } from "./lobby-slots";

const knownGames = (lineup: LineupEntry[]) =>
  lineup.flatMap((entry) => (isGameId(entry.type) ? [{ entry, definition: gameDefinition(entry.type) }] : []));

export type StageLobbyProps = {
  sessionId: string;
  roomCode: string;
  sessionName: string;
  lineup: LineupEntry[];
  players: LobbyPlayer[];
  status: LobbyStatus;
  isStarting: boolean;
  actionError: string | null;
  onStart: () => void;
  onRemovePlayer: (playerId: string) => void;
};

const startHintId = (playerCount: number, isStarting: boolean) => {
  if (isStarting) return "lobby.starting";
  return playerCount === 0 ? "lobby.startNeedsPlayers" : "lobby.startHint";
};

export const StageLobby = ({
  sessionId,
  roomCode,
  sessionName,
  lineup,
  players,
  status,
  isStarting,
  actionError,
  onStart,
  onRemovePlayer,
}: StageLobbyProps) => {
  const intl = useIntl();
  const [removing, setRemoving] = useState<LobbyPlayer | null>(null);
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const askToRemove = (playerId: string) => setRemoving(players.find((player) => player.id === playerId) ?? null);
  return (
    <StageViewport>
      <StageLayout
        className="gap-12 py-16"
        mainClassName="flex-row gap-16"
        header={
          <>
            <Logo size="lg" />
            {sessionName && (
              <span className="truncate font-display text-stage-lg font-semibold text-fg-subtle">{sessionName}</span>
            )}
            <TrustNote size="stage">
              <FormattedMessage id="lobby.trust" />
            </TrustNote>
          </>
        }
        footer={
          <>
            <div className="flex min-w-0 items-center gap-5">
              <span className="shrink-0 text-stage-body text-fg-subtle">
                <FormattedMessage id="lobby.todaysGames" />
              </span>
              <ul className="flex min-w-0 gap-5">
                {knownGames(lineup).map(({ entry, definition }, index) => (
                  <GameChip
                    key={entry.id}
                    position={index + 1}
                    title={<FormattedMessage id={definition.titleId} />}
                    meta={<FormattedMessage id={definition.roundCountId} values={{ count: entry.roundCount }} />}
                  />
                ))}
              </ul>
            </div>
            <div className="flex min-w-0 items-center gap-6">
              {status === "reconnecting" ? (
                <p role="status" className="min-w-0 text-right text-stage-caption text-fg-subtle">
                  <FormattedMessage id="connection.reconnecting" />
                </p>
              ) : (
                <p
                  role={actionError ? "alert" : "status"}
                  className="min-w-0 text-right text-stage-caption text-fg-subtle"
                >
                  {actionError ?? <FormattedMessage id={startHintId(players.length, isStarting)} />}
                </p>
              )}
              <Link
                to="/host/$sessionId/setup"
                params={{ sessionId }}
                className={cn(buttonVariants({ variant: "secondary", size: "stage-sm" }), "shrink-0")}
              >
                <FormattedMessage id="lobby.editGames" />
              </Link>
              <Button
                size="stage"
                className="shrink-0"
                disabled={players.length === 0 || isStarting || status !== "connected"}
                onClick={onStart}
              >
                <FormattedMessage id="lobby.start" />
              </Button>
            </div>
          </>
        }
      >
        <section className="flex w-[860px] shrink-0 flex-col justify-center gap-10">
          <Heading size="stage-title">
            <FormattedMessage id="lobby.title" />
          </Heading>
          <JoinSteps
            steps={[
              <FormattedMessage
                key="address"
                id="lobby.stepAddress"
                values={{ address: <strong className="text-stage-xl text-fg">{displayHost()}</strong> }}
              />,
              <FormattedMessage key="code" id="lobby.stepCode" />,
            ]}
            qr={
              <QrCode
                value={joinUrl(roomCode)}
                label={intl.formatMessage({ id: "lobby.qrLabel" }, { code: roomCode })}
              />
            }
            qrCaption={<FormattedMessage id="lobby.qrCaption" />}
          >
            <RoomCodeDisplay
              code={roomCode}
              label={intl.formatMessage({ id: "lobby.roomCodeLabel" }, { code: spellOut(roomCode) })}
            />
          </JoinSteps>
        </section>
        <StagePanel
          title={<FormattedMessage id="lobby.playersTitle" />}
          aside={
            <Pill variant="accent">
              <FormattedMessage id="lobby.joinedCount" values={{ count: players.length }} />
            </Pill>
          }
          className="flex-1"
        >
          <PlayerGrid columns={3}>
            {lobbySlots(players).map((slot) => {
              if (slot.kind === "waiting") {
                return <PlayerChip key={slot.key} state="waiting" name={intl.formatMessage({ id: "lobby.waiting" })} />;
              }
              if (slot.kind === "more") {
                return (
                  <button
                    key="more"
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => setIsRosterOpen(true)}
                    className="focus-ring min-w-0 cursor-pointer rounded-card text-left"
                  >
                    <PlayerChip
                      state="waiting"
                      name={intl.formatMessage({ id: "lobby.morePlayers" }, { count: slot.count })}
                    />
                  </button>
                );
              }
              const { player } = slot;
              return (
                <PlayerChip
                  key={player.id}
                  state="joined"
                  name={player.name}
                  colorKey={player.id}
                  avatarSrc={avatarSrc(sessionId, player)}
                  className={player.isConnected ? undefined : "opacity-60"}
                  remove={{
                    label: intl.formatMessage({ id: "lobby.removePlayer" }, { name: player.name }),
                    onRemove: () => askToRemove(player.id),
                  }}
                />
              );
            })}
          </PlayerGrid>
        </StagePanel>
      </StageLayout>
      <PlayerRosterDialog
        open={isRosterOpen}
        onOpenChange={setIsRosterOpen}
        title={<FormattedMessage id="lobby.allPlayers" values={{ count: players.length }} />}
        players={players.map((player) => ({
          id: player.id,
          name: player.name,
          colorKey: player.id,
          avatarSrc: avatarSrc(sessionId, player),
        }))}
        removeText={<FormattedMessage id="lobby.removeConfirm" />}
        removeLabel={(name) => intl.formatMessage({ id: "lobby.removePlayer" }, { name })}
        onRemove={askToRemove}
        closeLabel={<FormattedMessage id="lobby.closeAllPlayers" />}
      />
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setRemoving(null);
        }}
        title={<FormattedMessage id="lobby.removeTitle" values={{ name: removing?.name ?? "" }} />}
        description={<FormattedMessage id="lobby.removeBody" />}
        confirmLabel={<FormattedMessage id="lobby.removeConfirm" />}
        cancelLabel={<FormattedMessage id="lobby.removeCancel" />}
        onConfirm={() => {
          if (removing) onRemovePlayer(removing.id);
        }}
      />
    </StageViewport>
  );
};
