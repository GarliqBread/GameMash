import type { QuizLeaderboard, QuizStageView } from "@gamemash/games/config";
import type { LobbyPlayer } from "@gamemash/shared";
import {
  BoltIcon,
  CorrectAnswerBanner,
  Leaderboard,
  type LeaderboardEntry,
  type Movement,
  ResultBars,
  StageLayout,
  StageNote,
  StageViewport,
} from "@gamemash/ui";
import type { ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import type { LobbyStatus } from "../../lib/lobby";
import { avatarSrc } from "../../lib/players";
import { ReconnectingNote } from "../session/ReconnectingNote";
import { QuizStageHeader, useAnswerOptions } from "./quiz-display";

type RevealView = Extract<QuizStageView, { kind: "reveal" }>;

const MS_PER_SECOND = 1000;

const movementOf = (rank: number, previousRank: number | null): Movement | undefined => {
  if (previousRank === null) return undefined;
  if (previousRank === rank) return { direction: "same" };
  return previousRank > rank
    ? { direction: "up", amount: previousRank - rank }
    : { direction: "down", amount: rank - previousRank };
};

const toEntries = (sessionId: string, board: QuizLeaderboard, players: Map<string, LobbyPlayer>): LeaderboardEntry[] =>
  board.entries.map((entry) => {
    const player = players.get(entry.playerId);
    return {
      id: entry.playerId,
      rank: entry.rank,
      name: player?.name ?? "",
      total: entry.total,
      gain: entry.gain,
      movement: movementOf(entry.rank, entry.previousRank),
      colorKey: entry.playerId,
      avatarSrc: player ? avatarSrc(sessionId, player) : undefined,
    };
  });

export type StageQuizRevealProps = {
  sessionId: string;
  view: RevealView;
  players: Map<string, LobbyPlayer>;
  status: LobbyStatus;
  next: ReactNode;
};

export const StageQuizReveal = ({ sessionId, view, players, status, next }: StageQuizRevealProps) => {
  const intl = useIntl();
  const toOptions = useAnswerOptions();
  const options = toOptions(view.answers);
  const correct = options.find((option) => option.shape === view.correct);
  const fastest = view.fastest ? players.get(view.fastest.playerId) : undefined;
  const formatNumber = (value: number) => intl.formatNumber(value);

  return (
    <StageViewport>
      <StageLayout
        mainClassName="flex-row gap-14"
        header={
          <QuizStageHeader
            progress={view}
            right={
              <span className="text-stage-body text-fg-subtle">
                <FormattedMessage
                  id="quiz.gotItRight"
                  values={{ correct: view.correctCount, total: view.participantCount }}
                />
              </span>
            }
          />
        }
        footer={
          <>
            {fastest && view.fastest ? (
              <StageNote icon={<BoltIcon size={34} />}>
                <FormattedMessage
                  id="quiz.fastest"
                  values={{
                    name: <strong className="text-fg">{fastest.name}</strong>,
                    seconds: view.fastest.ms / MS_PER_SECOND,
                  }}
                />
              </StageNote>
            ) : (
              <span />
            )}
            <div className="flex shrink-0 items-center gap-6">
              <ReconnectingNote status={status} />
              {next}
            </div>
          </>
        }
      >
        <section className="flex min-w-0 flex-1 flex-col gap-7">
          <p className="text-stage-lg text-fg-muted hyphens-auto wrap-break-word">{view.text}</p>
          {correct && (
            <CorrectAnswerBanner
              shape={correct.shape}
              label={correct.label}
              shapeLabel={correct.shapeLabel}
              caption={<FormattedMessage id="quiz.correctAnswer" />}
            />
          )}
          <ResultBars
            className="mt-2"
            total={view.participantCount}
            correct={view.correct}
            correctLabel={intl.formatMessage({ id: "quiz.correctAnswerHidden" })}
            rows={options.map((option) => ({ ...option, count: view.counts[option.shape] }))}
          />
        </section>
        {view.leaderboard && (
          <Leaderboard
            className="w-[700px] shrink-0"
            title={<FormattedMessage id="quiz.leaderboard" />}
            subtitle={<FormattedMessage id="quiz.afterQuestion" values={{ number: view.questionIndex + 1 }} />}
            entries={toEntries(sessionId, view.leaderboard, players)}
            totalCount={Math.max(view.leaderboard.rankedCount, players.size)}
            moreLabel={(count) => <FormattedMessage id="quiz.morePlayers" values={{ count }} />}
            formatNumber={formatNumber}
            movementLabels={{
              up: (amount) => intl.formatMessage({ id: "quiz.movementUp" }, { amount }),
              down: (amount) => intl.formatMessage({ id: "quiz.movementDown" }, { amount }),
              same: () => intl.formatMessage({ id: "quiz.movementSame" }),
            }}
          />
        )}
      </StageLayout>
    </StageViewport>
  );
};
