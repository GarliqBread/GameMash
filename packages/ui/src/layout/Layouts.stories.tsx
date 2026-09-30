import { useState } from "react";
import { useCopy } from "../../.ladle/pseudo";
import type { Story, StoryDefault } from "../../.ladle/types";
import { Logo } from "../icons/Logo";
import { Button } from "../primitives/Button";
import { Pill } from "../primitives/Pill";
import { RoomCodeInput } from "../primitives/RoomCodeInput";
import { TextField } from "../primitives/TextField";
import { TrustNote } from "../primitives/TrustNote";
import { PhoneShell } from "./PhoneShell";
import { StageLayout } from "./StageLayout";
import { StageViewport } from "./StageViewport";

export default { title: "Layout" } satisfies StoryDefault;

export const Stage: Story = () => {
  const t = useCopy();
  return (
    <StageViewport>
      <StageLayout
        header={
          <>
            <div className="flex items-center gap-5">
              <Pill>{t("Pop quiz")}</Pill>
              <span className="text-stage-lg font-bold text-fg-muted">{t("Question 4 of 10")}</span>
            </div>
            <TrustNote size="stage">{t("Nothing is saved after the game")}</TrustNote>
          </>
        }
        footer={
          <>
            <Logo size="lg" />
            <Button size="stage">{t("Start game")}</Button>
          </>
        }
        mainClassName="items-center justify-center rounded-panel border-2 border-dashed border-border-strong"
      >
        <span className="text-stage-3xl font-display font-extrabold">1920 × 1080</span>
      </StageLayout>
    </StageViewport>
  );
};

export const PhonePaper: Story = () => {
  const t = useCopy();
  const [code, setCode] = useState("KWPX");
  return (
    <PhoneShell
      theme="paper"
      header={<Logo />}
      footer={<TrustNote>{t("Your name and photo are deleted when the session ends.")}</TrustNote>}
      bottomAction={<Button size="lg">{t("Join")}</Button>}
    >
      <h1 className="font-display text-[38px] leading-[1.05] font-extrabold tracking-[-0.02em]">
        {t("Join the game")}
      </h1>
      <RoomCodeInput
        label={t("Room code")}
        description={t("It's shown on the big screen")}
        value={code}
        onValueChange={setCode}
        letterLabel={(position, length) => t(`Letter ${position} of ${length}`)}
      />
      <TextField label={t("Your name")} placeholder={t("e.g. Priya")} autoComplete="nickname" maxLength={20} />
    </PhoneShell>
  );
};

export const PhoneStickyAction: Story = () => {
  const t = useCopy();
  return (
    <PhoneShell
      theme="paper"
      header={<Logo />}
      isBottomActionSticky
      bottomAction={
        <>
          <Button size="lg">{t("Save")}</Button>
          <Button variant="ghost">{t("Cancel")}</Button>
        </>
      }
    >
      <h1 className="font-display text-[38px] leading-[1.05] font-extrabold tracking-[-0.02em]">{t("Your look")}</h1>
      {Array.from({ length: 12 }, (_, index) => `row-${index}`).map((key) => (
        <div key={key} className="h-20 shrink-0 rounded-field bg-surface" />
      ))}
    </PhoneShell>
  );
};

export const PhoneStage: Story = () => {
  const t = useCopy();
  return (
    <PhoneShell
      theme="stage"
      header={
        <>
          <span className="font-bold text-fg-muted">{t("Drawing 3 / 9")}</span>
          <Pill variant="accent" size="phone">
            9
          </Pill>
        </>
      }
      bottomAction={<Button size="lg">{t("I'm done")}</Button>}
    >
      <div className="flex aspect-square w-full items-center justify-center rounded-card bg-canvas text-ink-950">
        {t("Canvas")}
      </div>
    </PhoneShell>
  );
};
