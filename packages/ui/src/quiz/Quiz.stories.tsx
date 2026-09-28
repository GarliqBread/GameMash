import { useState } from "react";
import { useCopy } from "../../.ladle/pseudo";
import { Caption, StageFrame } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { TimerPill } from "../game/TimerPill";
import { PhoneShell } from "../layout/PhoneShell";
import { ANSWER_SHAPES, type AnswerOption, type AnswerShapeName } from "../lib/answers";
import { Avatar } from "../primitives/Avatar";
import { Button } from "../primitives/Button";
import { AnswerButtonGroup } from "./AnswerButton";
import { AnswerGrid } from "./AnswerGrid";
import { CorrectAnswerBanner } from "./CorrectAnswerBanner";
import { ResultBars } from "./ResultBars";

export default { title: "Quiz" } satisfies StoryDefault;

const useOptions = (labels: string[]): AnswerOption[] => {
  const t = useCopy();
  return labels.map((label, index) => ({ shape: ANSWER_SHAPES[index] ?? "square", label: t(label) }));
};

export const StageGrids: Story = () => {
  const four = useOptions(["Jupiter", "Saturn", "Uranus", "Neptune"]);
  const three = useOptions(["Amsterdam", "Rotterdam", "Utrecht"]);
  const two = useOptions(["True", "False"]);
  const german = useOptions([
    "Antwortmöglichkeiten mischen",
    "Nachzügler dürfen mitspielen",
    "Donaudampfschifffahrtsgesellschaft",
    "Ja",
  ]);
  return (
    <StageFrame>
      <Caption>4 options</Caption>
      <AnswerGrid options={four} aria-label="Answer options" />
      <Caption>3 options</Caption>
      <AnswerGrid options={three} aria-label="Answer options" />
      <Caption>2 options (true / false)</Caption>
      <AnswerGrid options={two} aria-label="Answer options" />
      <Caption>Long German labels wrap</Caption>
      <AnswerGrid options={german} aria-label="Antwortmöglichkeiten" lang="de" />
    </StageFrame>
  );
};

export const StageReveal: Story = () => {
  const four = useOptions(["Jupiter", "Saturn", "Uranus", "Neptune"]);
  const two = useOptions(["True", "False"]);
  return (
    <StageFrame>
      <Caption>Reveal: correct keeps a cream ring, the rest dim</Caption>
      <AnswerGrid options={four} correct="diamond" correctLabel="Correct answer" aria-label="Answer options" />
      <AnswerGrid options={two} correct="triangle" correctLabel="Correct answer" aria-label="Answer options" />
    </StageFrame>
  );
};

export const RevealSummary: Story = () => {
  const t = useCopy();
  const rows = useOptions(["Jupiter", "Saturn", "Uranus", "Neptune"]).map((option, index) => ({
    ...option,
    count: [3, 5, 0, 1][index] ?? 0,
  }));
  return (
    <StageFrame width={1100}>
      <p className="text-stage-lg text-fg-muted">{t("Which planet has the most known moons?")}</p>
      <CorrectAnswerBanner shape="diamond" label={t("Saturn")} caption={t("Correct answer")} />
      <ResultBars rows={rows} total={9} correct="diamond" correctLabel={t("correct")} />
      <Caption>Long label</Caption>
      <CorrectAnswerBanner
        shape="circle"
        label="Donaudampfschifffahrtsgesellschaft"
        caption="Richtige Antwort"
        lang="de"
      />
      <ResultBars
        rows={[
          { shape: "triangle", label: "Donaudampfschifffahrtsgesellschaft", count: 12 },
          { shape: "circle", label: "Ja", count: 30 },
        ]}
        total={42}
        correct="circle"
        correctLabel="richtig"
      />
    </StageFrame>
  );
};

const PhoneAnswer = ({ count, locked }: { count: 2 | 3 | 4; locked?: boolean }) => {
  const t = useCopy();
  const options = useOptions(["Jupiter", "Saturn", "Uranus", "Neptune"]).slice(0, count);
  const [selected, setSelected] = useState<AnswerShapeName | undefined>(undefined);
  return (
    <div className="h-[844px] w-[390px] overflow-hidden rounded-card border border-border-strong">
      <PhoneShell
        theme="stage"
        className="min-h-[844px]"
        header={
          <>
            <span className="font-bold text-fg-muted">{t("Question 4 / 10")}</span>
            <TimerPill seconds={14} label={t("14 seconds left")} tone={selected || locked ? "idle" : "active"} />
          </>
        }
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar name="Priya" size={36} />
              <span className="truncate font-bold">Priya</span>
            </div>
            <span className="shrink-0 text-fg-muted">
              <strong className="font-display text-xl text-fg">2,560</strong> {t("pts")}
            </span>
          </div>
        }
      >
        <p className="text-fg-subtle">{t("Tap the shape that matches the big screen.")}</p>
        <AnswerButtonGroup
          aria-label={t("Answer options")}
          options={options}
          onAnswer={setSelected}
          locked={locked ?? false}
          {...(selected && { selected })}
        />
        {selected && (
          <Button variant="ghost" size="sm" onClick={() => setSelected(undefined)}>
            Reset (story only)
          </Button>
        )}
      </PhoneShell>
    </div>
  );
};

export const PhoneButtons: Story = () => (
  <div data-theme="stage" className="flex flex-wrap gap-8 bg-bg p-8">
    <PhoneAnswer count={4} />
    <PhoneAnswer count={3} />
    <PhoneAnswer count={2} />
    <PhoneAnswer count={4} locked />
  </div>
);
