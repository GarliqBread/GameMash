import type { QuizLeaderboard, QuizStageView } from "@gamemash/games/config";
import { type LobbyPlayer, MS_PER_SECOND } from "@gamemash/shared";
import {
  BoltIcon,
  CorrectAnswerBanner,
  Leaderboard,
  type LeaderboardEntry,
  type Movement,
  ResultBars,
  RichText,
  StageLayout,
  StageNote,
  StageViewport,
} from "@gamemash/ui";
import type { ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import type { LobbyStatus } from "../../lib/lobby";
import { avatarSrc } from "../../lib/players";
import { useSecondsLeft } from "../game/useSecondsLeft";
import { useHostCredentials } from "../host/host-credentials";
import { ReconnectingNote } from "../session/ReconnectingNote";
import { QuizStageHeader } from "./QuizStageHeader";
import { useAnswerOptions } from "./useAnswerOptions";
import { usePreloadImages } from "./useQuestionImages";

type RevealView = Extract<QuizStageView, { kind: "reveal" }>;

const movementOf = (rank: number, previousRank: number | null): Movement | undefined => {
  if (previousRank === null) return undefined;
  if (previousRank === rank) return { direction: "same" };
  return previousRank > rank
    ? { direction: "up", amount: previousRank - rank }
    : { direction: "down", amount: rank - previousRank };
};

const fastestOf = (view: RevealView, players: Map<string, LobbyPlayer>) => {
  if (!view.fastest) return null;
  const player = players.get(view.fastest.playerId);
  return player ? { name: player.name, seconds: view.fastest.ms / MS_PER_SECOND } : null;
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
  view: RevealView;
  players: Map<string, LobbyPlayer>;
  status: LobbyStatus;
  phaseEndsAt: number | null;
  countdownLabelId: string;
  next: ReactNode;
};

export const StageQuizReveal = ({
  view,
  players,
  status,
  phaseEndsAt,
  countdownLabelId,
  next,
}: StageQuizRevealProps) => {
  const { sessionId } = useHostCredentials();
  const intl = useIntl();
  const toOptions = useAnswerOptions();
  const options = toOptions(view.answers);
  const correct = options.find((option) => option.shape === view.correct);
  const fastest = fastestOf(view, players);
  const formatNumber = (value: number) => intl.formatNumber(value);
  const seconds = useSecondsLeft(phaseEndsAt);
  usePreloadImages(view.nextImages);

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
                  values={{
                    correct: view.correctCount,
                    total: view.participantCount,
                  }}
                />
              </span>
            }
          />
        }
        footer={
          <>
            {fastest && (
              <StageNote icon={<BoltIcon size={34} />}>
                <FormattedMessage
                  id="quiz.fastest"
                  values={{
                    name: <strong className="text-fg">{fastest.name}</strong>,
                    seconds: fastest.seconds,
                  }}
                />
              </StageNote>
            )}
            <div className="ml-auto flex shrink-0 items-center gap-6">
              <ReconnectingNote status={status} />
              {phaseEndsAt !== null && (
                <span className="text-stage-caption text-fg-subtle">
                  <FormattedMessage id={countdownLabelId} values={{ seconds }} />
                </span>
              )}
              {next}
            </div>
          </>
        }
      >
        <section className="flex min-w-0 flex-1 flex-col gap-7">
          <p className="text-stage-lg text-fg-muted hyphens-auto wrap-break-word">
            <RichText runs={view.text} />
          </p>
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
            correctLabel={intl.formatMessage({
              id: "quiz.correctAnswerHidden",
            })}
            rows={options.map((option) => ({
              ...option,
              count: view.counts[option.shape],
            }))}
          />
        </section>
        {view.leaderboard && (
          <Leaderboard
            className="w-175 shrink-0"
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
