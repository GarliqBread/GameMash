import { useState } from "react";
import { useCopy } from "../../.ladle/pseudo";
import { QUIZ_OPTIONS } from "../../.ladle/screen-data";
import type { Story, StoryDefault } from "../../.ladle/types";
import { AnswerTileEditor } from "../host/AnswerTileEditor";
import { GameLineup, type GameLineupLabels, type LineupGame } from "../host/GameLineup";
import { InsertGameSlot } from "../host/InsertGameSlot";
import { QuestionTabs } from "../host/QuestionTabs";
import { RichTextField } from "../host/RichTextField";
import { SessionNameSticker } from "../host/SessionNameSticker";
import { SettingsField } from "../host/Settings";
import { AnswerShape } from "../icons/AnswerShape";
import { CopyIcon, ImageIcon, MonitorIcon, PencilIcon, PlayIcon, TrashIcon } from "../icons/icons";
import { Logo } from "../icons/Logo";
import { ANSWER_SHAPES, type AnswerShapeName } from "../lib/answers";
import type { RichTextRun } from "../lib/rich-text";
import { Button } from "../primitives/Button";
import { Heading } from "../primitives/Heading";
import { SegmentedControl } from "../primitives/SegmentedControl";
import { TrustNote } from "../primitives/TrustNote";
import { AutosaveIndicator } from "../workshop/AutosaveIndicator";
import { ConfirmDialog } from "../workshop/ConfirmDialog";
import { RuleSwitchList } from "../workshop/RuleSwitchList";
import { RulesPanel } from "../workshop/RulesPanel";
import { SectionTab } from "../workshop/SectionTab";
import { ToolButton } from "../workshop/ToolButton";
import { WorkshopShell } from "../workshop/WorkshopShell";

export default { title: "Screens / Host" } satisfies StoryDefault;

const QUESTION_IDS = Array.from({ length: 10 }, (_, index) => `q${index + 1}`);
const QUESTION_MAX_LENGTH = 90;
const TIME_LIMITS = ["10", "20", "30", "60", "120"];

const QuizIcon = () => (
  <span className="grid grid-cols-2 gap-1 text-ink-950">
    {ANSWER_SHAPES.map((shape) => (
      <AnswerShape key={shape} shape={shape} size={18} />
    ))}
  </span>
);

const useLineup = (): LineupGame[] => {
  const t = useCopy();
  return [
    { id: "quiz", title: t("Pop quiz"), accent: "sun", icon: <QuizIcon />, metaChips: [t("10 questions"), t("20 s")] },
    {
      id: "draw",
      title: t("Draw it"),
      accent: "brand-coral",
      icon: <PencilIcon size={32} strokeWidth={2.2} className="text-ink-950" />,
      metaChips: [t("5 rounds"), t("60 s")],
    },
  ];
};

const useLineupLabels = (): GameLineupLabels => {
  const t = useCopy();
  return {
    gameNumber: (position) => t(`Game ${position}`),
    editing: t("Editing"),
    dragHandle: (game) => t(`Reorder ${game.title}`),
    instructions: t("Press space to pick up a game, use the arrow keys to move it, and space again to drop it."),
    pickedUp: (game, position) => t(`Picked up ${game.title}, position ${position}`),
    movedTo: (game, position) => t(`${game.title} moved to position ${position}`),
    dropped: (game, position) => t(`${game.title} dropped at position ${position}`),
    cancelled: (game) => t(`Moving ${game.title} was cancelled`),
  };
};

const useRules = () => {
  const [rules, setRules] = useState({ speed: true, board: true, shuffle: false, late: true });
  const toggle = (key: keyof typeof rules) => (checked: boolean) =>
    setRules((current) => ({ ...current, [key]: checked }));
  return { rules, toggle };
};

export const HostSetup: Story = () => {
  const t = useCopy();
  const lineupLabels = useLineupLabels();
  const lineup = useLineup();
  const [order, setOrder] = useState(lineup.map((game) => game.id));
  const [selectedGame, setSelectedGame] = useState("quiz");
  const [sessionName, setSessionName] = useState("Friday team mash");
  const [questionIds, setQuestionIds] = useState(QUESTION_IDS);
  const [question, setQuestion] = useState("q4");
  const [questionText, setQuestionText] = useState<RichTextRun[]>([
    { text: "Which planet has the " },
    { text: "most", bold: true },
    { text: " known moons?" },
  ]);
  const [answers, setAnswers] = useState(
    Object.fromEntries(QUIZ_OPTIONS.map((option) => [option.shape, option.label])) as Record<AnswerShapeName, string>,
  );
  const [correct, setCorrect] = useState<AnswerShapeName | null>("triangle");
  const [time, setTime] = useState("20");
  const [questionTime, setQuestionTime] = useState("default");
  const [points, setPoints] = useState("double");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { rules, toggle } = useRules();
  const games = order.flatMap((id) => lineup.filter((game) => game.id === id));
  const questionPosition = questionIds.indexOf(question) + 1;

  return (
    <WorkshopShell
      lineupLabel={t("Game lineup")}
      settingsLabel={t("Game rules")}
      header={
        <>
          <Logo size="md" />
          <SessionNameSticker label={t("Session")} value={sessionName} onValueChange={setSessionName} />
          <div className="flex-1" />
          <Button variant="secondary" icon={<MonitorIcon size={20} strokeWidth={2.2} />}>
            {t("Preview on big screen")}
          </Button>
          <Button size="lg" icon={<PlayIcon size={22} />} className="workshop:shadow-brutal-lg">
            {t("Start session")}
          </Button>
        </>
      }
      lineup={
        <>
          <SectionTab>{t("Game lineup")}</SectionTab>
          <GameLineup
            games={games}
            selectedId={selectedGame}
            onSelect={setSelectedGame}
            onReorder={(next) => setOrder(next.map((game) => game.id))}
            labels={lineupLabels}
          />
          <InsertGameSlot className="mt-3">{t("+ Insert game")}</InsertGameSlot>
          <div className="flex-1" />
          <TrustNote>{t("No accounts. Names, photos and answers are deleted when the session ends.")}</TrustNote>
        </>
      }
      editor={
        <>
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <SectionTab as="span" variant="accent">
                {t("Pop quiz")}
              </SectionTab>
              <Heading size="host">{t("Edit questions")}</Heading>
            </div>
            <AutosaveIndicator
              status="saved"
              labels={{ saving: t("Saving…"), saved: t("Auto-saved"), error: t("Not saved, retry") }}
            />
          </div>
          <QuestionTabs
            questionIds={questionIds}
            value={question}
            onValueChange={setQuestion}
            listLabel={t("Questions")}
            tabLabel={(position, isIncomplete) =>
              isIncomplete ? t(`Question ${position}, incomplete`) : t(`Question ${position}`)
            }
            incompleteIds={["q7"]}
            addLabel={t("Add question")}
            onAdd={() => setQuestionIds((ids) => [...ids, `q${ids.length + 1}`])}
          >
            <div className="flex flex-col gap-5">
              <RichTextField
                label={t(`Question ${questionPosition}`)}
                value={questionText}
                onValueChange={setQuestionText}
                maxLength={QUESTION_MAX_LENGTH}
                maxRuns={40}
                counterLabel={(length, max) => t(`${length} / ${max}`)}
                placeholder={t("Type your question")}
                toolbarLabel={t("Text formatting")}
                markLabels={{ bold: t("Bold"), italic: t("Italic"), underline: t("Underline") }}
              />
              <AnswerTileEditor
                legend={t("Answers · type right on the tiles")}
                answers={QUIZ_OPTIONS.map((option) => ({
                  shape: option.shape,
                  value: answers[option.shape],
                  inputLabel: t(`${option.shape} answer`),
                  correctAriaLabel: t(`Mark correct: ${option.shape}`),
                }))}
                onAnswerChange={(shape, value) => setAnswers((current) => ({ ...current, [shape]: value }))}
                correct={correct}
                onCorrectChange={setCorrect}
                correctLabel={t("Correct")}
                markCorrectLabel={t("Mark correct")}
              />
              <div className="flex flex-wrap gap-x-8 gap-y-5">
                <SettingsField label={t("Time for this question")}>
                  {(labelId) => (
                    <SegmentedControl
                      aria-labelledby={labelId}
                      value={questionTime}
                      onValueChange={setQuestionTime}
                      options={[
                        { value: "default", label: t(`Default (${time} s)`) },
                        ...TIME_LIMITS.map((seconds) => ({ value: seconds, label: t(`${seconds} s`) })),
                      ]}
                    />
                  )}
                </SettingsField>
                <SettingsField label={t("Points")}>
                  {(labelId) => (
                    <SegmentedControl
                      aria-labelledby={labelId}
                      value={points}
                      onValueChange={setPoints}
                      options={[
                        { value: "standard", label: t("Standard") },
                        { value: "double", label: t("Double") },
                      ]}
                    />
                  )}
                </SettingsField>
              </div>
              <div className="mt-1 flex flex-wrap gap-3">
                <ToolButton icon={<ImageIcon size={18} strokeWidth={2.2} />}>{t("Add image")}</ToolButton>
                <ToolButton icon={<CopyIcon size={18} strokeWidth={2.2} />}>{t("Duplicate")}</ToolButton>
                <ToolButton icon={<TrashIcon size={18} strokeWidth={2.2} />} onClick={() => setConfirmingDelete(true)}>
                  {t("Delete")}
                </ToolButton>
              </div>
            </div>
          </QuestionTabs>
          <ConfirmDialog
            open={confirmingDelete}
            onOpenChange={setConfirmingDelete}
            title={t(`Delete question ${questionPosition}?`)}
            description={t("This can't be undone.")}
            confirmLabel={t("Delete")}
            cancelLabel={t("Keep it")}
            onConfirm={() => setConfirmingDelete(false)}
          />
        </>
      }
      settings={
        <RulesPanel title={t("Game rules")}>
          <SettingsField label={t("Default time per question")}>
            {(labelId) => (
              <SegmentedControl
                aria-labelledby={labelId}
                value={time}
                onValueChange={setTime}
                options={TIME_LIMITS.map((seconds) => ({ value: seconds, label: t(`${seconds} s`) }))}
              />
            )}
          </SettingsField>
          <RuleSwitchList
            onLabel={t("On")}
            offLabel={t("Off")}
            rules={[
              {
                id: "speed",
                label: t("Faster answers earn more points"),
                checked: rules.speed,
                onCheckedChange: toggle("speed"),
              },
              {
                id: "board",
                label: t("Show leaderboard after each question"),
                checked: rules.board,
                onCheckedChange: toggle("board"),
              },
              {
                id: "shuffle",
                label: t("Shuffle answer order"),
                checked: rules.shuffle,
                onCheckedChange: toggle("shuffle"),
              },
              { id: "late", label: t("Let late joiners play"), checked: rules.late, onCheckedChange: toggle("late") },
            ]}
          />
        </RulesPanel>
      }
    />
  );
};
