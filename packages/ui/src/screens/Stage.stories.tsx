import { useCopy } from "../../.ladle/pseudo";
import { LIGHTHOUSE } from "../../.ladle/sample-drawings";
import {
  DRAW_RESULTS,
  FINAL_SCORES,
  FINISHED_DRAWING,
  JOIN_URL,
  LEADERBOARD,
  PLAYER_NAMES,
  QUIZ_COUNTS,
  QUIZ_OPTIONS,
  ROOM_CODE,
  SAMPLE_QUESTION_IMAGES,
  SHAPE_LABELS,
} from "../../.ladle/screen-data";
import type { Story, StoryDefault } from "../../.ladle/types";
import { DrawingFrame } from "../draw/DrawingFrame";
import { DrawingResultCard, DrawingResultChip } from "../draw/DrawingResult";
import { RatingScalePreview } from "../draw/RatingScalePreview";
import { CountStat } from "../game/CountStat";
import { DecorativeShapes } from "../game/DecorativeShapes";
import { GameChip } from "../game/GameChip";
import { JoinSteps } from "../game/JoinSteps";
import { Leaderboard } from "../game/Leaderboard";
import { PlayerChip } from "../game/PlayerChip";
import { PlayerGrid } from "../game/PlayerGrid";
import { Podium, RankChipList } from "../game/Podium";
import { ProgressDots } from "../game/ProgressDots";
import { QrCode } from "../game/QrCode";
import { RoomCodeDisplay, spellOut } from "../game/RoomCodeDisplay";
import { StageHeader } from "../game/StageHeader";
import { StageNote } from "../game/StageNote";
import { StagePanel } from "../game/StagePanel";
import { TimerRing } from "../game/TimerRing";
import { WordCard } from "../game/WordCard";
import { BoltIcon, EyeOffIcon, ShieldCheckIcon } from "../icons/icons";
import { Logo } from "../icons/Logo";
import { StageLayout } from "../layout/StageLayout";
import { StageViewport } from "../layout/StageViewport";
import { Button } from "../primitives/Button";
import { Heading } from "../primitives/Heading";
import { Pill } from "../primitives/Pill";
import { RichText } from "../primitives/RichText";
import { TrustNote } from "../primitives/TrustNote";
import { AnswerGrid } from "../quiz/AnswerGrid";
import { CorrectAnswerBanner } from "../quiz/CorrectAnswerBanner";
import { QuestionImageGrid } from "../quiz/QuestionImageGrid";
import { ResultBars } from "../quiz/ResultBars";

export default { title: "Screens / Big screen" } satisfies StoryDefault;

const formatScore = (value: number) => new Intl.NumberFormat("en").format(value);
const formatAverage = (value: number) =>
  new Intl.NumberFormat("en", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);

export const Lobby: Story = () => {
  const t = useCopy();
  return (
    <StageViewport>
      <StageLayout
        className="gap-12 py-16"
        mainClassName="flex-row gap-16"
        header={
          <>
            <Logo size="lg" />
            <span className="truncate font-display text-stage-lg font-semibold text-fg-subtle">Friday team mash</span>
            <TrustNote size="stage">{t("Nothing is saved after the game")}</TrustNote>
          </>
        }
        footer={
          <>
            <div className="flex min-w-0 items-center gap-5">
              <span className="shrink-0 text-stage-body text-fg-subtle">{t("Today's games")}</span>
              <ul className="flex min-w-0 gap-5">
                <GameChip position={1} title={t("Pop quiz")} meta={t("10 questions")} />
                <GameChip position={2} title={t("Draw it")} meta={t("5 rounds")} />
              </ul>
            </div>
            <div className="flex min-w-0 items-center gap-6">
              <Button size="stage" className="shrink-0">
                {t("Start game")}
              </Button>
            </div>
          </>
        }
      >
        <section className="flex w-[860px] shrink-0 flex-col justify-center gap-10">
          <Heading size="stage-title">{t("Join on your phone")}</Heading>
          <JoinSteps
            steps={[
              <>
                {t("Go to")} <strong className="text-stage-xl text-fg">{JOIN_URL}</strong>
              </>,
              t("Enter the room code"),
            ]}
            qr={
              <QrCode value={`https://${JOIN_URL}/join/${ROOM_CODE}`} label={t(`QR code to join room ${ROOM_CODE}`)} />
            }
            qrCaption={t("Or scan with your phone camera")}
          >
            <RoomCodeDisplay code={ROOM_CODE} label={t(`Room code ${spellOut(ROOM_CODE)}`)} />
          </JoinSteps>
        </section>
        <StagePanel title={t("Players")} aside={<Pill variant="accent">{t("9 joined")}</Pill>} className="flex-1">
          <PlayerGrid columns={3}>
            {PLAYER_NAMES.map((name) => (
              <PlayerChip key={name} state="joined" name={name} />
            ))}
            {["slot-1", "slot-2", "slot-3"].map((slot) => (
              <PlayerChip key={slot} state="waiting" name={t("Empty")} />
            ))}
          </PlayerGrid>
        </StagePanel>
      </StageLayout>
    </StageViewport>
  );
};

const QuizHeader = ({ right }: { right: React.ReactNode }) => {
  const t = useCopy();
  return <StageHeader game={t("Pop quiz")} progress={t("Question 4 of 10")} right={right} />;
};

export const QuizQuestion: Story = () => {
  const t = useCopy();
  return (
    <StageViewport>
      <StageLayout
        mainClassName="gap-10"
        header={
          <QuizHeader
            right={
              <>
                <CountStat value={7} total={9} caption={t("answered")} />
                <TimerRing seconds={14} total={20} label={t("14 seconds left")} warningLabel={t("5 seconds left")} />
              </>
            }
          />
        }
      >
        <div className="flex flex-1 items-center justify-center">
          <Heading size="stage-hero" className="max-w-[1500px] text-center">
            {t("Which planet has the most known moons?")}
          </Heading>
        </div>
        <AnswerGrid
          aria-label={t("Answer options")}
          options={QUIZ_OPTIONS.map((option) => ({
            ...option,
            label: t(option.label),
          }))}
        />
      </StageLayout>
    </StageViewport>
  );
};

export const QuizQuestionWithImages: Story = () => {
  const t = useCopy();
  return (
    <StageViewport>
      <StageLayout
        mainClassName="gap-8"
        header={
          <QuizHeader
            right={
              <>
                <CountStat value={7} total={9} caption={t("answered")} />
                <TimerRing seconds={14} total={20} label={t("14 seconds left")} warningLabel={t("5 seconds left")} />
              </>
            }
          />
        }
      >
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8">
          <Heading size="stage-sub" className="max-w-[1500px] text-center font-medium">
            <RichText
              runs={[
                { text: t("Which of these planets has the ") },
                { text: t("most"), bold: true },
                { text: t(" known moons?") },
              ]}
            />
          </Heading>
          <div className="min-h-0 w-full flex-1">
            <QuestionImageGrid images={SAMPLE_QUESTION_IMAGES.slice(0, 4)} />
          </div>
        </div>
        <AnswerGrid
          density="compact"
          aria-label={t("Answer options")}
          options={QUIZ_OPTIONS.map((option) => ({
            ...option,
            label: t(option.label),
          }))}
        />
      </StageLayout>
    </StageViewport>
  );
};

export const QuizReveal: Story = () => {
  const t = useCopy();
  return (
    <StageViewport>
      <StageLayout
        mainClassName="flex-row gap-14"
        header={
          <QuizHeader right={<span className="text-stage-body text-fg-subtle">{t("5 of 9 got it right")}</span>} />
        }
        footer={
          <>
            <StageNote icon={<BoltIcon size={34} />}>
              {t("Fastest right answer:")} <strong className="text-fg">Priya</strong>, 2.1 s
            </StageNote>
            <div className="flex shrink-0 items-center gap-6">
              <span className="text-stage-caption text-fg-subtle">{t("Next question in 8 s")}</span>
              <Button variant="secondary" size="stage-sm">
                {t("Next now")}
              </Button>
            </div>
          </>
        }
      >
        <section className="flex min-w-0 flex-1 flex-col gap-7">
          <p className="text-stage-lg text-fg-muted">{t("Which planet has the most known moons?")}</p>
          <CorrectAnswerBanner
            shape="triangle"
            label={t("Saturn")}
            shapeLabel={SHAPE_LABELS.triangle}
            caption={t("Correct answer")}
          />
          <ResultBars
            className="mt-2"
            total={9}
            correct="triangle"
            correctLabel={t("correct answer")}
            rows={QUIZ_OPTIONS.map((option) => ({
              ...option,
              label: t(option.label),
              count: QUIZ_COUNTS[option.shape],
            }))}
          />
        </section>
        <Leaderboard
          className="w-[700px] shrink-0"
          title={t("Leaderboard")}
          subtitle={t("after question 4")}
          entries={LEADERBOARD}
          limit={5}
          moreLabel={(count) => t(`+ ${count} more players`)}
          formatNumber={formatScore}
          movementLabels={{
            up: (amount) => t(`up ${amount}`),
            down: (amount) => t(`down ${amount}`),
            same: () => t("no change"),
          }}
        />
      </StageLayout>
    </StageViewport>
  );
};

export const FinalPodium: Story = () => {
  const t = useCopy();
  return (
    <StageViewport>
      <StageLayout
        className="gap-6 py-12"
        mainClassName="gap-6"
        backdrop={<DecorativeShapes />}
        header={
          <>
            <Logo size="lg" />
            <span className="text-stage-body text-fg-subtle">{t("Pop quiz + Draw it - 9 players")}</span>
          </>
        }
        footer={
          <>
            <StageNote icon={<ShieldCheckIcon size={30} />} className="text-stage-caption">
              {t("When the host ends the session, all names, photos and answers are deleted.")}
            </StageNote>
            <div className="flex shrink-0 gap-4">
              <Button variant="secondary" size="stage-sm">
                {t("End session")}
              </Button>
              <Button size="stage-sm">{t("Play again")}</Button>
            </div>
          </>
        }
      >
        <div className="flex flex-col items-center gap-1">
          <Heading size="stage-hero">{t("Final scores")}</Heading>
          <span className="text-stage-lg text-fg-muted">Friday team mash</span>
        </div>
        <Podium
          className="flex-1"
          players={FINAL_SCORES}
          formatNumber={formatScore}
          rankLabel={(rank) => t(`Place ${rank}`)}
          aria-label={t("Top three")}
        />
        <RankChipList players={FINAL_SCORES.slice(3)} formatNumber={formatScore} aria-label={t("Other players")} />
      </StageLayout>
    </StageViewport>
  );
};

const DrawHeader = ({ progress, right }: { progress: string; right: React.ReactNode }) => {
  const t = useCopy();
  return <StageHeader game={t("Draw it")} progress={progress} right={right} />;
};

export const DrawPrompt: Story = () => {
  const t = useCopy();
  return (
    <StageViewport>
      <StageLayout
        mainClassName="items-center justify-center gap-9"
        header={
          <DrawHeader
            progress={t("Round 2 of 5")}
            right={
              <TimerRing seconds={42} total={60} label={t("42 seconds left")} warningLabel={t("5 seconds left")} />
            }
          />
        }
        footer={
          <div className="flex w-full flex-col gap-[18px]">
            <CountStat layout="inline" size="md" value={t("6 of 9")} caption={t("finished drawing")} />
            <PlayerGrid columns={9} className="gap-x-3.5">
              {PLAYER_NAMES.map((name) => (
                <PlayerChip
                  key={name}
                  state={FINISHED_DRAWING.has(name) ? "done" : "drawing"}
                  name={name}
                  statusLabel={FINISHED_DRAWING.has(name) ? t("Done") : t("Still drawing")}
                />
              ))}
            </PlayerGrid>
          </div>
        }
      >
        <span className="text-stage-xl text-fg-muted">{t("Everyone draw")}</span>
        <WordCard as="h1">{t("Lighthouse")}</WordCard>
        <span className="mt-3 text-stage-body text-fg-subtle">
          {t("Draw on your phone. Nobody sees whose drawing is whose until the votes are in.")}
        </span>
      </StageLayout>
    </StageViewport>
  );
};

export const DrawVote: Story = () => {
  const t = useCopy();
  return (
    <StageViewport>
      <StageLayout
        className="gap-8"
        mainClassName="flex-row gap-[72px]"
        header={
          <DrawHeader
            progress={t("Voting - “Lighthouse”")}
            right={
              <>
                <span className="text-stage-body font-bold">{t("Drawing 3 of 9")}</span>
                <ProgressDots total={9} current={3} />
              </>
            }
          />
        }
      >
        <DrawingFrame
          drawing={LIGHTHOUSE}
          label={t("Drawing number 3")}
          size={860}
          className="rounded-panel shadow-card-stage"
        />
        <section className="flex min-w-0 flex-1 flex-col justify-center gap-10">
          <div className="flex flex-col">
            <span className="text-stage-lg text-fg-subtle">{t("Drawing")}</span>
            <span className="font-display text-stage-word/[0.9] font-extrabold tracking-[-0.04em]">#3</span>
          </div>
          <Heading size="stage-sub">{t("Rate it on your phone, 1 to 10")}</Heading>
          <RatingScalePreview />
          <StageNote icon={<EyeOffIcon size={34} />}>{t("Names stay hidden until every drawing is rated")}</StageNote>
          <div className="mt-3 flex items-center gap-7">
            <TimerRing
              size={112}
              seconds={9}
              total={10}
              label={t("9 seconds left")}
              warningLabel={t("5 seconds left")}
            />
            <CountStat
              align="start"
              size="md"
              value={5}
              total={8}
              caption={t("have rated (the artist sits this one out)")}
            />
          </div>
        </section>
      </StageLayout>
    </StageViewport>
  );
};

export const DrawResults: Story = () => {
  const t = useCopy();
  return (
    <StageViewport>
      <StageLayout
        className="gap-8"
        mainClassName="gap-7"
        header={
          <DrawHeader
            progress={t("Round 2 results")}
            right={<span className="text-stage-body text-fg-subtle">{t("9 drawings - 72 ratings")}</span>}
          />
        }
        footer={
          <>
            <span className="text-stage-body text-fg-muted">
              {t("Points = average rating × 100, added to your session total")}
            </span>
            <div className="flex shrink-0 items-center gap-6">
              <span className="text-stage-caption text-fg-subtle">{t("Next round in 8 s")}</span>
              <Button variant="secondary" size="stage-sm">
                {t("Next now")}
              </Button>
            </div>
          </>
        }
      >
        <Heading size="stage-title">{t("And the best lighthouse is…")}</Heading>
        <ol className="grid grid-cols-3 gap-8">
          {DRAW_RESULTS.slice(0, 3).map((result) => (
            <DrawingResultCard
              key={result.name}
              rank={result.rank as 1 | 2 | 3}
              name={result.name}
              drawing={result.drawing}
              drawingLabel={t(`Drawing by ${result.name}`)}
              average={formatAverage(result.average)}
              outOf={t("/ 10")}
              points={`+${Math.round(result.average * 100)}`}
            />
          ))}
        </ol>
        <ol className="grid grid-cols-6 gap-5">
          {DRAW_RESULTS.slice(3).map((result) => (
            <DrawingResultChip
              key={result.name}
              rank={`#${result.rank}`}
              name={result.name}
              drawing={result.drawing}
              drawingLabel={t(`Drawing by ${result.name}`)}
              average={formatAverage(result.average)}
            />
          ))}
        </ol>
      </StageLayout>
    </StageViewport>
  );
};
