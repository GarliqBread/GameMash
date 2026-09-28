import { gameDefinition, isGameId } from "@gamemash/games";
import { avatarPath, type LineupEntry, type LobbyPlayer } from "@gamemash/shared";
import {
  buttonVariants,
  cn,
  GameChip,
  Heading,
  JoinSteps,
  Logo,
  Pill,
  PlayerChip,
  PlayerGrid,
  QrCode,
  RoomCodeDisplay,
  StageLayout,
  StagePanel,
  StageViewport,
  spellOut,
  TrustNote,
} from "@gamemash/ui";
import { Link } from "@tanstack/react-router";
import { FormattedMessage, useIntl } from "react-intl";
import type { LobbyStatus } from "../../lib/lobby";
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
};

export const StageLobby = ({ sessionId, roomCode, sessionName, lineup, players, status }: StageLobbyProps) => {
  const intl = useIntl();
  return (
    <StageViewport>
      <StageLayout
        className="gap-12 py-16"
        mainClassName="flex-row gap-16"
        header={
          <>
            <Logo tone="stage" size="lg" />
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
              {status === "reconnecting" && (
                <p role="status" className="text-stage-caption text-fg-subtle">
                  <FormattedMessage id="connection.reconnecting" />
                </p>
              )}
              <Link
                to="/host/$sessionId/setup"
                params={{ sessionId }}
                className={cn(buttonVariants({ variant: "secondary", size: "stage-sm" }), "shrink-0")}
              >
                <FormattedMessage id="lobby.editGames" />
              </Link>
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
                  <PlayerChip
                    key="more"
                    state="waiting"
                    name={intl.formatMessage({ id: "lobby.morePlayers" }, { count: slot.count })}
                  />
                );
              }
              const { player } = slot;
              return (
                <PlayerChip
                  key={player.id}
                  state="joined"
                  name={player.name}
                  colorKey={player.id}
                  avatarSrc={
                    player.avatarVersion === null ? undefined : avatarPath(sessionId, player.id, player.avatarVersion)
                  }
                  className={player.isConnected ? undefined : "opacity-60"}
                />
              );
            })}
          </PlayerGrid>
        </StagePanel>
      </StageLayout>
    </StageViewport>
  );
};
