import { PhoneShell, PlayerScoreBar } from "@gamemash/ui";
import type { ReactNode } from "react";
import { FormattedMessage } from "react-intl";
import type { LobbyStatus } from "../../lib/lobby";

export type PlayerIdentity = {
  playerId: string;
  name: string;
  avatarSrc: string | undefined;
};

export type PlayFrameProps = {
  me: PlayerIdentity;
  total: number;
  status: LobbyStatus;
  header?: ReactNode;
  mainClassName?: string | undefined;
  children: ReactNode;
};

export const PlayFrame = ({ me, total, status, header, mainClassName, children }: PlayFrameProps) => (
  <PhoneShell
    theme="stage"
    className="bg-bg"
    mainClassName={mainClassName}
    header={header}
    footer={
      <div className="flex flex-col gap-2">
        {status === "reconnecting" && (
          <p role="status" className="text-caption text-fg-subtle">
            <FormattedMessage id="connection.reconnecting" />
          </p>
        )}
        <PlayerScoreBar
          name={me.name}
          colorKey={me.playerId}
          avatarSrc={me.avatarSrc}
          score={
            <FormattedMessage
              id="play.points"
              values={{
                points: total,
                strong: (chunks) => <strong className="font-display text-xl text-fg">{chunks}</strong>,
              }}
            />
          }
        />
      </div>
    }
  >
    {children}
  </PhoneShell>
);
