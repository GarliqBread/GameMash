import { avatarPath, type LobbyPlayer } from "@gamemash/shared";
import { Avatar, Heading, Logo, PhoneShell, Pill, TrustNote } from "@gamemash/ui";
import { FormattedMessage } from "react-intl";
import type { PlayerCredentials } from "../../lib/credentials";
import type { LobbyStatus } from "../../lib/lobby";

export type WaitingScreenProps = {
  credentials: PlayerCredentials;
  me: LobbyPlayer | undefined;
  playerCount: number | undefined;
  status: LobbyStatus;
  isPhotoFailed: boolean;
};

export const WaitingScreen = ({ credentials, me, playerCount, status, isPhotoFailed }: WaitingScreenProps) => {
  const name = me?.name ?? credentials.name;
  const avatarSrc =
    me?.avatarVersion == null ? undefined : avatarPath(credentials.sessionId, credentials.playerId, me.avatarVersion);
  return (
    <PhoneShell
      theme="paper"
      mainClassName="items-center justify-center gap-6 text-center"
      header={<Logo tone="paper" />}
      footer={
        <TrustNote>
          <FormattedMessage id="join.trust" />
        </TrustNote>
      }
    >
      <Avatar name={name} colorKey={credentials.playerId} src={avatarSrc} size={140} />
      <div className="flex min-w-0 max-w-full flex-col gap-2">
        <Heading>
          <FormattedMessage id="waiting.title" />
        </Heading>
        <p className="truncate font-display text-3xl font-extrabold">{name}</p>
      </div>
      <p className="text-xl text-fg-muted">
        <FormattedMessage id="waiting.body" />
      </p>
      {playerCount !== undefined && (
        <Pill variant="surface" size="phone">
          <FormattedMessage id="waiting.playerCount" values={{ count: playerCount }} />
        </Pill>
      )}
      {isPhotoFailed && (
        <p role="alert" className="text-caption font-bold text-danger">
          <FormattedMessage id="waiting.photoFailed" />
        </p>
      )}
      {status === "reconnecting" && (
        <p role="status" className="text-caption text-fg-subtle">
          <FormattedMessage id="connection.reconnecting" />
        </p>
      )}
    </PhoneShell>
  );
};
