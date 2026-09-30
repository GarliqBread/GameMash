import { type QuizPlayerView, rankOf } from "@gamemash/games/config";
import type { FinishedSnapshot, GameSnapshot } from "@gamemash/shared";
import { Heading, Pill } from "@gamemash/ui";
import { FormattedMessage } from "react-intl";
import type { PlayerCredentials } from "../../lib/credentials";
import type { LobbyStatus } from "../../lib/lobby";
import { PhoneDrawIt } from "../draw/PhoneDrawIt";
import { PhoneQuizAnswering } from "../quiz/PhoneQuizAnswering";
import { PhoneQuizQuestion, PhoneQuizReveal } from "../quiz/PhoneQuizStatus";
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
  if (snapshot.gameType === "draw-it") {
    return <PhoneDrawIt credentials={credentials} me={me} snapshot={snapshot} status={status} />;
  }
  if (snapshot.gameType !== "pop-quiz") return null;

  const view = snapshot.view as QuizPlayerView;
  if (view.kind === "question") return <PhoneQuizQuestion me={me} view={view} status={status} />;
  if (view.kind === "reveal") return <PhoneQuizReveal me={me} view={view} status={status} />;
  return (
    <PhoneQuizAnswering
      key={snapshot.phaseId}
      me={me}
      view={view}
      phaseId={snapshot.phaseId}
      phaseEndsAt={snapshot.phaseEndsAt}
      status={status}
    />
  );
};
