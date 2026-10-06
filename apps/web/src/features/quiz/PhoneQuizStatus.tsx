import type { QuizPlayerView } from "@gamemash/games/config";
import { MS_PER_SECOND } from "@gamemash/shared";
import { Avatar, CheckIcon, cn } from "@gamemash/ui";
import { FormattedMessage, useIntl } from "react-intl";
import type { PlayerCredentials } from "../../lib/credentials";
import type { LobbyStatus } from "../../lib/lobby";
import { avatarSrc } from "../../lib/players";
import { usePlayers } from "../game/usePlayers";
import { PhoneLookUp } from "../play/PhoneLookUp";
import { type PlayerIdentity, PlayFrame } from "../play/PlayFrame";
import { PhoneQuizProgress } from "./PhoneQuizProgress";

type QuestionView = Extract<QuizPlayerView, { kind: "question" }>;
type RevealView = Extract<QuizPlayerView, { kind: "reveal" }>;

type StatusProps<View> = { me: PlayerIdentity; view: View; status: LobbyStatus };

export const PhoneQuizQuestion = ({ me, view, status }: StatusProps<QuestionView>) => (
  <PhoneLookUp
    me={me}
    total={view.total}
    status={status}
    header={<PhoneQuizProgress progress={view} />}
    bodyId="quiz.getReady"
  />
);

const resultId = (view: RevealView) => {
  if (view.result?.isCorrect) return "play.resultGotIt";
  if (view.result) return "play.resultWrong";
  return view.isParticipant ? "play.resultMissed" : "play.revealNotThisRound";
};

const ResultCard = ({ view }: { view: RevealView }) => {
  const { result } = view;
  const tone = !result
    ? "bg-surface text-fg"
    : result.isCorrect
      ? "bg-success text-ink-950"
      : "bg-brand-coral text-ink-950";
  return (
    <section className={cn("flex flex-col gap-2 rounded-tile px-6 py-6", tone)}>
      <h1 className="flex items-center gap-3 font-display text-heading-sm font-extrabold">
        {result?.isCorrect && <CheckIcon size={26} strokeWidth={3} />}
        <FormattedMessage id={resultId(view)} />
      </h1>
      {result?.isCorrect && (
        <p className="font-display text-monogram-lg font-extrabold">
          <FormattedMessage id="play.pointsGainedShort" values={{ points: result.points }} />
        </p>
      )}
      <p className="text-lead font-bold">
        {result?.isCorrect ? (
          <FormattedMessage
            id="play.answeredIn"
            values={{ answer: view.correct.text, seconds: result.ms / MS_PER_SECOND }}
          />
        ) : (
          <FormattedMessage id="play.theAnswer" values={{ answer: view.correct.text }} />
        )}
      </p>
    </section>
  );
};

type BoardRow = { playerId: string; rank: number; total: number; isApart: boolean };

const boardRows = (view: RevealView, meId: string): BoardRow[] => {
  const entries = view.leaderboard?.entries ?? [];
  const rows = entries.map((entry) => ({ ...entry, isApart: false }));
  const isListed = entries.some((entry) => entry.playerId === meId);
  if (isListed || view.rank === null) return rows;
  return [...rows, { playerId: meId, rank: view.rank, total: view.total, isApart: true }];
};

const PhoneLeaderboard = ({ view, me, sessionId }: { view: RevealView; me: PlayerIdentity; sessionId: string }) => {
  const players = usePlayers();
  const intl = useIntl();
  if (!view.leaderboard) return null;
  return (
    <section className="flex flex-col gap-3 rounded-tile border-2 border-border bg-surface px-5 py-4.5">
      <h2 className="font-display text-heading-sm font-extrabold">
        <FormattedMessage id="quiz.leaderboard" />
      </h2>
      <ol className="flex flex-col gap-2">
        {boardRows(view, me.playerId).map((row) => {
          const player = players.get(row.playerId);
          return (
            <li
              key={row.playerId}
              className={cn(
                "flex min-w-0 items-center gap-3",
                row.playerId === me.playerId && "font-extrabold text-sun",
                row.isApart && "mt-1 border-t-2 border-border pt-3",
              )}
            >
              <span className="w-6 shrink-0 font-display text-lead font-extrabold tabular-nums">{row.rank}</span>
              <Avatar
                name={player?.name ?? me.name}
                colorKey={row.playerId}
                src={player ? avatarSrc(sessionId, player) : undefined}
                size={36}
              />
              <span className="min-w-0 flex-1 truncate text-lead font-bold">{player?.name ?? me.name}</span>
              <span className="shrink-0 font-display text-lead font-extrabold tabular-nums">
                {intl.formatNumber(row.total)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

type RevealProps = StatusProps<RevealView> & { credentials: PlayerCredentials };

export const PhoneQuizReveal = ({ me, view, status, credentials }: RevealProps) => (
  <PlayFrame
    me={me}
    total={view.total}
    status={status}
    header={<PhoneQuizProgress progress={view} />}
    mainClassName="gap-4"
  >
    <ResultCard view={view} />
    <PhoneLeaderboard view={view} me={me} sessionId={credentials.sessionId} />
  </PlayFrame>
);
