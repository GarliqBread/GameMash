import { rankOf } from "@gamemash/games/config";
import type { FinishedSnapshot, GameSnapshot } from "@gamemash/shared";
import { Heading, Pill } from "@gamemash/ui";
import { FormattedMessage } from "react-intl";
import type { PlayerCredentials } from "../../lib/credentials";
import type { LobbyStatus } from "../../lib/lobby";
import { playerGameOf } from "../games/game-views";
import { GamePhone } from "../games/phone-games";
import { type PlayerIdentity, PlayFrame } from "./PlayFrame";

const placeOf = (snapshot: FinishedSnapshot, playerId: string) => {
  const totals = Object.fromEntries(snapshot.standings.map((standing) => [standing.playerId, standing.points]));
  return { points: totals[playerId] ?? 0, rank: rankOf(totals, playerId) };
};

const PhoneFinal = ({
  me,
  snapshot,
  status,
}: {
  me: PlayerIdentity;
  snapshot: FinishedSnapshot;
  status: LobbyStatus;
}) => {
  const { points, rank } = placeOf(snapshot, me.playerId);
  return (
    <PlayFrame me={me} total={points} status={status} mainClassName="items-center justify-center gap-4 text-center">
      <Heading>
        <FormattedMessage id="final.title" />
      </Heading>
      <Pill variant="accent" size="phone">
        <FormattedMessage id="play.finalPlace" values={{ rank }} />
      </Pill>
      <p className="text-xl text-fg-muted">
        <FormattedMessage id="play.finalBody" />
      </p>
    </PlayFrame>
  );
};

export type PlayGameProps = {
  credentials: PlayerCredentials;
  me: PlayerIdentity;
  snapshot: GameSnapshot;
  status: LobbyStatus;
};

export const PlayGame = ({ credentials, me, snapshot, status }: PlayGameProps) => {
  if (snapshot.status === "finished") return <PhoneFinal me={me} snapshot={snapshot} status={status} />;
  const game = playerGameOf(snapshot);
  if (!game) return null;
  return <GamePhone game={game} credentials={credentials} me={me} snapshot={snapshot} status={status} />;
};
