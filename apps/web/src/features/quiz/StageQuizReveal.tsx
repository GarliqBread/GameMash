import { POP_QUIZ_AUTO_NEXT_SECONDS, type QuizLeaderboard, type QuizStageView } from "@gamemash/games/config";
import { type LobbyPlayer, MS_PER_SECOND } from "@gamemash/shared";
import {
  BoltIcon,
  CorrectAnswerBanner,
  cn,
  Leaderboard,
  type LeaderboardEntry,
  type Movement,
  ResultBars,
  RichText,
  StageLayout,
  StageNote,
  StageViewport,
} from "@gamemash/ui";
import { useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { type LobbyStatus, nextPhase, useLobbyStore } from "../../lib/lobby";
import { avatarSrc } from "../../lib/players";
import { HostNextButton } from "../game/HostNextButton";
import { useSecondsLeft } from "../game/useSecondsLeft";
import { useHostCredentials } from "../host/host-credentials";
import { ReconnectingNote } from "../session/ReconnectingNote";
import { useStageMediaUrls } from "./proof-media";
import { QuizStageHeader } from "./QuizStageHeader";
import { isPlayedVideo, type NextTarget, ProofFigure, ProofPanel, ScoresNote } from "./StageQuizProof";
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

const AUTO_NEXT_AFTER_VIDEO_MS = POP_QUIZ_AUTO_NEXT_SECONDS * MS_PER_SECOND;
const NEXT_RETRY_MS = 2000;
const NEXT_ATTEMPTS = 5;

const useNextAfterVideo = (phaseId: number, isVideo: boolean, autoNext: boolean) => {
  const clockOffset = useLobbyStore((store) => store.clockOffset);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [hasEnded, setHasEnded] = useState(!isVideo);
  const seconds = useSecondsLeft(endsAt);

  useEffect(() => {
    if (endsAt === null) return;
    let attempts = 0;
    let timer = setTimeout(function send() {
      attempts += 1;
      void nextPhase(phaseId).then((result) => {
        if (!result.ok && attempts < NEXT_ATTEMPTS) timer = setTimeout(send, NEXT_RETRY_MS);
      });
    }, AUTO_NEXT_AFTER_VIDEO_MS);
    return () => clearTimeout(timer);
  }, [endsAt, phaseId]);

  const onVideoEnded = () => {
    if (hasEnded) return;
    setHasEnded(true);
    if (autoNext) setEndsAt(Date.now() + clockOffset + AUTO_NEXT_AFTER_VIDEO_MS);
  };

  return { hasEnded, endsAt, seconds, onVideoEnded };
};

const nextTargetOf = (labelId: string): NextTarget => {
  if (labelId === "game.nextQuestion") return "question";
  return labelId === "game.nextGame" ? "game" : "final";
};

export type StageQuizRevealProps = {
  view: RevealView;
  players: Map<string, LobbyPlayer>;
  status: LobbyStatus;
  phaseId: number;
  phaseEndsAt: number | null;
  canAdvance: boolean;
  nextLabelId: string;
  countdownLabelId: string;
};

const Answers = ({ view, size }: { view: RevealView; size: "default" | "compact" }) => {
  const intl = useIntl();
  const toOptions = useAnswerOptions();
  const options = toOptions(view.answers);
  const correct = options.find((option) => option.shape === view.correct);
  const isCompact = size === "compact";
  return (
    <>
      <p
        className={cn(
          "hyphens-auto wrap-break-word",
          isCompact ? "text-stage-body text-fg-muted" : "text-stage-lg text-fg-muted",
        )}
      >
        <RichText runs={view.text} />
      </p>
      {correct && (
        <CorrectAnswerBanner
          size={size}
          shape={correct.shape}
          label={correct.label}
          shapeLabel={correct.shapeLabel}
          caption={<FormattedMessage id="quiz.correctAnswer" />}
        />
      )}
      <ResultBars
        size={size}
        className="mt-2"
        total={view.participantCount}
        correct={view.correct}
        correctLabel={intl.formatMessage({ id: "quiz.correctAnswerHidden" })}
        rows={options.map((option) => ({ ...option, count: view.counts[option.shape] }))}
      />
    </>
  );
};

const RevealLeaderboard = ({ view, players }: { view: RevealView; players: Map<string, LobbyPlayer> }) => {
  const { sessionId } = useHostCredentials();
  const intl = useIntl();
  if (!view.leaderboard) return null;
  return (
    <Leaderboard
      className="w-175 shrink-0"
      title={<FormattedMessage id="quiz.leaderboard" />}
      subtitle={<FormattedMessage id="quiz.afterQuestion" values={{ number: view.questionIndex + 1 }} />}
      entries={toEntries(sessionId, view.leaderboard, players)}
      totalCount={Math.max(view.leaderboard.rankedCount, players.size)}
      moreLabel={(count) => <FormattedMessage id="quiz.morePlayers" values={{ count }} />}
      formatNumber={(value) => intl.formatNumber(value)}
      movementLabels={{
        up: (amount) => intl.formatMessage({ id: "quiz.movementUp" }, { amount }),
        down: (amount) => intl.formatMessage({ id: "quiz.movementDown" }, { amount }),
        same: () => intl.formatMessage({ id: "quiz.movementSame" }),
      }}
    />
  );
};

const RevealBody = ({
  view,
  players,
  target,
  onVideoEnded,
}: {
  view: RevealView;
  players: Map<string, LobbyPlayer>;
  target: NextTarget;
  onVideoEnded: () => void;
}) => {
  const urlOf = useStageMediaUrls(view.proof);
  const { proof } = view;
  if (!proof) {
    return (
      <>
        <section className="flex min-w-0 flex-1 flex-col gap-7">
          <Answers view={view} size="default" />
        </section>
        <RevealLeaderboard view={view} players={players} />
      </>
    );
  }
  const media = { proof, urlOf, onVideoEnded, target, autoNext: view.autoNext };
  if (proof.layout === "big") {
    return (
      <>
        <ProofFigure {...media} className="flex-1" />
        <section className="flex w-150 shrink-0 flex-col gap-5.5">
          <Answers view={view} size="compact" />
          <div className="mt-auto rounded-tile border-2 border-border bg-surface px-6.5 py-5">
            <ScoresNote proof={proof} target={target} autoNext={view.autoNext} />
          </div>
        </section>
      </>
    );
  }
  return (
    <>
      <section className="flex min-w-0 flex-1 flex-col gap-7">
        <Answers view={view} size="default" />
      </section>
      <ProofPanel {...media} className="w-205 shrink-0" />
    </>
  );
};

export const StageQuizReveal = ({
  view,
  players,
  status,
  phaseId,
  phaseEndsAt,
  canAdvance,
  nextLabelId,
  countdownLabelId,
}: StageQuizRevealProps) => {
  const fastest = fastestOf(view, players);
  const isVideo = isPlayedVideo(view.proof);
  const afterVideo = useNextAfterVideo(phaseId, isVideo, view.autoNext);
  const timerSeconds = useSecondsLeft(phaseEndsAt);
  const target = nextTargetOf(nextLabelId);
  const isPlaying = isVideo && !afterVideo.hasEnded;
  const countdownSeconds = afterVideo.endsAt !== null ? afterVideo.seconds : timerSeconds;
  const hasCountdown = phaseEndsAt !== null || afterVideo.endsAt !== null;
  usePreloadImages(view.nextImages);

  return (
    <StageViewport>
      <StageLayout
        mainClassName={cn("flex-row", view.proof ? "gap-12" : "gap-14")}
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
            {fastest && (
              <StageNote icon={<BoltIcon size={34} />}>
                <FormattedMessage
                  id="quiz.fastest"
                  values={{ name: <strong className="text-fg">{fastest.name}</strong>, seconds: fastest.seconds }}
                />
              </StageNote>
            )}
            <div className="ml-auto flex shrink-0 items-center gap-6">
              <ReconnectingNote status={status} />
              {isPlaying && view.autoNext ? (
                <span className="text-stage-caption text-fg-subtle">
                  <FormattedMessage id="quiz.afterVideo" values={{ target }} />
                </span>
              ) : (
                hasCountdown &&
                !isPlaying && (
                  <span className="text-stage-caption text-fg-subtle">
                    <FormattedMessage id={countdownLabelId} values={{ seconds: countdownSeconds }} />
                  </span>
                )
              )}
              {canAdvance && (
                <HostNextButton
                  key={phaseId}
                  phaseId={phaseId}
                  label={<FormattedMessage id={isPlaying ? "quiz.skipVideo" : nextLabelId} />}
                />
              )}
            </div>
          </>
        }
      >
        <RevealBody view={view} players={players} target={target} onVideoEnded={afterVideo.onVideoEnded} />
      </StageLayout>
    </StageViewport>
  );
};
