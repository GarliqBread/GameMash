import { useEffect, useState } from "react";
import { useCopy } from "../../.ladle/pseudo";
import { HOUSE, LIGHTHOUSE } from "../../.ladle/sample-drawings";
import { QUIZ_OPTIONS, ROOM_CODE } from "../../.ladle/screen-data";
import type { Story, StoryDefault } from "../../.ladle/types";
import { DrawingCanvas } from "../draw/DrawingCanvas";
import { DrawingFrame } from "../draw/DrawingFrame";
import { DrawingToolbar } from "../draw/DrawingToolbar";
import { OwnDrawingNotice } from "../draw/OwnDrawingNotice";
import { RatingScale } from "../draw/RatingScale";
import { useDrawing } from "../draw/useDrawing";
import { PlayerScoreBar } from "../game/PlayerScoreBar";
import { TimerPill } from "../game/TimerPill";
import { Logo } from "../icons/Logo";
import { PhoneShell } from "../layout/PhoneShell";
import type { AnswerShapeName } from "../lib/answers";
import { Button } from "../primitives/Button";
import { Heading } from "../primitives/Heading";
import { PhotoPickerButton } from "../primitives/PhotoPickerButton";
import { RoomCodeInput } from "../primitives/RoomCodeInput";
import { TextField } from "../primitives/TextField";
import { TrustNote } from "../primitives/TrustNote";
import { AnswerButtonGroup } from "../quiz/AnswerButton";

export default { title: "Screens / Phone" } satisfies StoryDefault;

export const Join: Story = () => {
  const t = useCopy();
  const [code, setCode] = useState(ROOM_CODE);
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  useEffect(() => () => (photo ? URL.revokeObjectURL(photo) : undefined), [photo]);
  return (
    <PhoneShell
      theme="paper"
      mainClassName="gap-7"
      header={<Logo />}
      footer={<TrustNote>{t("No account needed. Your name and photo are deleted when the session ends.")}</TrustNote>}
      bottomAction={
        <Button size="lg" type="submit" form="join">
          {t("Join")}
        </Button>
      }
    >
      <Heading>{t("Join the game")}</Heading>
      <form id="join" className="flex flex-col gap-[22px]" onSubmit={(event) => event.preventDefault()}>
        <RoomCodeInput
          label={t("Room code")}
          description={t("It's shown on the big screen")}
          value={code}
          onValueChange={setCode}
        />
        <TextField label={t("Your name")} placeholder={t("e.g. Priya")} autoComplete="nickname" maxLength={20} />
        <PhotoPickerButton
          label={
            <>
              {t("Add a photo")} <span className="font-normal text-fg-subtle">{t("(optional)")}</span>
            </>
          }
          hint={t("Otherwise we show your initials.")}
          previewSrc={photo}
          onFileSelect={(file) => setPhoto(URL.createObjectURL(file))}
        />
      </form>
    </PhoneShell>
  );
};

export const Answer: Story = () => {
  const t = useCopy();
  const [selected, setSelected] = useState<AnswerShapeName | undefined>(undefined);
  return (
    <PhoneShell
      theme="stage"
      className="bg-bg"
      mainClassName="gap-3.5"
      header={
        <>
          <span className="font-bold text-fg-muted">{t("Question 4 / 10")}</span>
          <TimerPill seconds={14} label={t("14 seconds left")} tone={selected ? "idle" : "active"} />
        </>
      }
      footer={
        <PlayerScoreBar
          name="Priya"
          score={
            <>
              <strong className="font-display text-xl text-fg">2,560</strong> {t("pts")}
            </>
          }
        />
      }
    >
      <p className="text-fg-subtle">{t("Tap the shape that matches the big screen.")}</p>
      <AnswerButtonGroup
        aria-label={t("Answer options")}
        options={QUIZ_OPTIONS.map((option) => ({ ...option, label: t(option.label) }))}
        selected={selected}
        onAnswer={setSelected}
      />
    </PhoneShell>
  );
};

export const Draw: Story = () => {
  const t = useCopy();
  const controller = useDrawing();
  return (
    <PhoneShell
      theme="stage"
      mainClassName="gap-3.5"
      header={
        <>
          <div className="flex min-w-0 flex-col">
            <span className="text-caption text-fg-subtle">{t("Draw")}</span>
            <Heading size="phone-sm" className="truncate">
              {t("Lighthouse")}
            </Heading>
          </div>
          <TimerPill seconds={42} label={t("42 seconds left")} />
        </>
      }
      bottomAction={<Button size="lg">{t("I'm done")}</Button>}
    >
      <DrawingCanvas controller={controller} label={t("Drawing area")} />
      <DrawingToolbar
        color={controller.color}
        onColorChange={controller.setColor}
        size={controller.size}
        onSizeChange={controller.setSize}
        tool={controller.tool}
        onToolChange={controller.setTool}
        onUndo={controller.undo}
        onClear={controller.clear}
        canUndo={!controller.isEmpty}
        labels={{
          colorGroup: t("Colour"),
          colors: {
            black: t("Black"),
            red: t("Red"),
            orange: t("Orange"),
            yellow: t("Yellow"),
            green: t("Green"),
            blue: t("Blue"),
            violet: t("Violet"),
          },
          sizeGroup: t("Brush size"),
          sizes: { thin: t("Thin brush"), medium: t("Medium brush"), thick: t("Thick brush") },
          eraser: t("Eraser"),
          undo: t("Undo"),
          clear: t("Clear drawing"),
        }}
      />
      <p className="text-caption text-fg-subtle">
        {t("Big, bold lines look best on the TV. Your name stays hidden while people vote.")}
      </p>
    </PhoneShell>
  );
};

export const Rate: Story = () => {
  const t = useCopy();
  const [rating, setRating] = useState<number | null>(8);
  return (
    <PhoneShell
      theme="stage"
      header={
        <>
          <span className="font-bold text-fg-muted">{t("Drawing 3 / 9")}</span>
          <TimerPill seconds={9} label={t("9 seconds left")} />
        </>
      }
      footer={
        <TrustNote icon="eye-off">
          {t(
            `Your rating: ${rating ?? "none yet"}. You can change it until time runs out. Nobody sees who voted what.`,
          )}
        </TrustNote>
      }
    >
      <DrawingFrame drawing={LIGHTHOUSE} label={t("Drawing number 3")} className="self-center" />
      <Heading size="phone-sm" as="h2" className="mt-1">
        {t("How good is it?")}
      </Heading>
      <RatingScale
        aria-label={t("Score from 1 to 10")}
        value={rating}
        onValueChange={setRating}
        lowLabel={t("1 · Not quite")}
        highLabel={t("Masterpiece · 10")}
      />
    </PhoneShell>
  );
};

export const RateOwn: Story = () => {
  const t = useCopy();
  return (
    <PhoneShell
      theme="stage"
      mainClassName="justify-center"
      header={
        <>
          <span className="font-bold text-fg-muted">{t("Drawing 5 / 9")}</span>
          <TimerPill seconds={12} tone="idle" label={t("12 seconds left")} />
        </>
      }
      footer={
        <TrustNote icon="eye-off">{t("Your score for this drawing comes from everyone else's ratings.")}</TrustNote>
      }
    >
      <OwnDrawingNotice
        drawing={HOUSE}
        drawingLabel={t("Your drawing")}
        badge={t("Yours")}
        title={t("This one's yours")}
        description={t("Sit back while the others rate it. Keep a straight face so you don't give it away.")}
      />
    </PhoneShell>
  );
};
