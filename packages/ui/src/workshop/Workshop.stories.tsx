import { useState } from "react";
import { useCopy } from "../../.ladle/pseudo";
import type { Story, StoryDefault } from "../../.ladle/types";
import { GameCartridge } from "../host/GameCartridge";
import { InsertGameSlot } from "../host/InsertGameSlot";
import { AnswerShape } from "../icons/AnswerShape";
import { CheckIcon, CopyIcon, ImageIcon, PencilIcon, TrashIcon } from "../icons/icons";
import { ANSWER_SHAPES } from "../lib/answers";
import { Switch } from "../primitives/Switch";
import { AutosaveIndicator, type AutosaveStatus } from "./AutosaveIndicator";
import { CoinToggleGroup } from "./CoinToggleGroup";
import { ConfirmDialog } from "./ConfirmDialog";
import { KeyButton } from "./KeyButton";
import { SectionTab } from "./SectionTab";
import { Sticker } from "./Sticker";
import { ToolButton } from "./ToolButton";

export default { title: "Workshop" } satisfies StoryDefault;

const Bench = ({ children }: { children: React.ReactNode }) => (
  <div data-theme="workshop" className="bg-graph-paper flex min-h-dvh flex-col gap-10 bg-bg p-10 text-fg">
    {children}
  </div>
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-3">
    <SectionTab>{label}</SectionTab>
    <div className="flex flex-wrap items-center gap-6">{children}</div>
  </section>
);

export const Keys: Story = () => {
  const [selected, setSelected] = useState(4);
  return (
    <Bench>
      <Row label="KeyButton">
        {[1, 2, 3, 4, 5].map((number) => (
          <KeyButton key={number} aria-pressed={number === selected} onClick={() => setSelected(number)}>
            {number}
          </KeyButton>
        ))}
        <KeyButton disabled>6</KeyButton>
      </Row>
      <Row label="ToolButton">
        <ToolButton icon={<ImageIcon size={18} strokeWidth={2.2} />}>Add image</ToolButton>
        <ToolButton icon={<CopyIcon size={18} strokeWidth={2.2} />}>Duplicate</ToolButton>
        <ToolButton icon={<TrashIcon size={18} strokeWidth={2.2} />}>Delete</ToolButton>
      </Row>
    </Bench>
  );
};

export const Stickers: Story = () => {
  const t = useCopy();
  return (
    <Bench>
      <Row label="Sticker tones">
        <Sticker tone="sun" rotate={-4} icon={<CheckIcon size={16} strokeWidth={3.2} />}>
          {t("Correct")}
        </Sticker>
        <Sticker tone="coral" rotate={6}>
          {t("Editing")}
        </Sticker>
        <Sticker tone="white">{t("Draft")}</Sticker>
        <Sticker tone="sun">Nachzügler willkommen</Sticker>
      </Row>
      <Row label="Section tabs">
        <SectionTab as="h3">{t("Game lineup")}</SectionTab>
        <SectionTab as="span" variant="accent">
          {t("Pop quiz")}
        </SectionTab>
      </Row>
    </Bench>
  );
};

export const Switches: Story = () => {
  const t = useCopy();
  const [first, setFirst] = useState(true);
  const [second, setSecond] = useState(false);
  return (
    <Bench>
      <Row label="On / Off">
        <Switch aria-label="On" checked={first} onCheckedChange={setFirst} onLabel={t("On")} offLabel={t("Off")} />
        <Switch aria-label="Off" checked={second} onCheckedChange={setSecond} onLabel={t("On")} offLabel={t("Off")} />
        <Switch aria-label="Aan" defaultChecked onLabel="Aan" offLabel="Uit" />
        <Switch aria-label="Eingeschaltet" defaultChecked onLabel="Eingeschaltet" offLabel="Ausgeschaltet" />
      </Row>
    </Bench>
  );
};

export const Coins: Story = () => {
  const [points, setPoints] = useState("1000");
  return (
    <Bench>
      <Row label="CoinToggleGroup">
        <CoinToggleGroup
          aria-label="Points for a right answer"
          value={points}
          onValueChange={setPoints}
          options={["500", "1000", "2000"].map((value) => ({ value, label: value }))}
        />
        <CoinToggleGroup
          aria-label="Punkte"
          value="1.000"
          onValueChange={() => {}}
          options={["500", "1.000", "2.000"].map((value) => ({ value, label: value }))}
        />
      </Row>
    </Bench>
  );
};

const QuizIcon = () => (
  <span className="grid grid-cols-2 gap-1 text-ink-950">
    {ANSWER_SHAPES.map((shape) => (
      <AnswerShape key={shape} shape={shape} size={18} />
    ))}
  </span>
);

export const Cartridges: Story = () => {
  const t = useCopy();
  const [selected, setSelected] = useState("quiz");
  return (
    <Bench>
      <div className="grid w-[640px] grid-cols-2 gap-8">
        <GameCartridge
          title={t("Pop quiz")}
          eyebrow={t("Game 1")}
          accent="sun"
          icon={<QuizIcon />}
          metaChips={[t("10 questions"), t("20 s")]}
          isSelected={selected === "quiz"}
          onSelect={() => setSelected("quiz")}
          editingLabel={t("Editing")}
          dragHandleLabel={t("Reorder Pop quiz")}
        />
        <GameCartridge
          title={t("Draw it")}
          eyebrow={t("Game 2")}
          accent="brand-coral"
          icon={<PencilIcon size={32} strokeWidth={2.2} className="text-ink-950" />}
          metaChips={[t("5 rounds"), t("60 s")]}
          isSelected={selected === "draw"}
          onSelect={() => setSelected("draw")}
          editingLabel={t("Editing")}
          dragHandleLabel={t("Reorder Draw it")}
        />
        <GameCartridge
          title="Kennst du dein Team wirklich?"
          eyebrow="Spiel 3"
          accent="brand-lime"
          icon={<QuizIcon />}
          metaChips={["12 Fragen", "30 Sekunden"]}
          isSelected={false}
          onSelect={() => {}}
          editingLabel="Bearbeiten"
          dragHandleLabel="Spiel 3 verschieben"
        />
        <InsertGameSlot>{t("+ Insert game")}</InsertGameSlot>
      </div>
    </Bench>
  );
};

export const Autosave: Story = () => {
  const t = useCopy();
  const [status, setStatus] = useState<AutosaveStatus>("error");
  const [confirming, setConfirming] = useState(false);
  const labels = { saving: t("Saving…"), saved: t("Auto-saved"), error: t("Not saved, retry") };
  return (
    <Bench>
      <Row label="AutosaveIndicator">
        <AutosaveIndicator status="saving" labels={labels} />
        <AutosaveIndicator status="saved" labels={labels} />
        <AutosaveIndicator status={status} labels={labels} onRetry={() => setStatus("saved")} />
      </Row>
      <Row label="ConfirmDialog">
        <ToolButton icon={<TrashIcon size={18} strokeWidth={2.2} />} onClick={() => setConfirming(true)}>
          {t("Delete")}
        </ToolButton>
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={t("Delete question 4?")}
          description={t("This can't be undone.")}
          confirmLabel={t("Delete")}
          cancelLabel={t("Keep it")}
          onConfirm={() => setConfirming(false)}
        />
      </Row>
    </Bench>
  );
};
