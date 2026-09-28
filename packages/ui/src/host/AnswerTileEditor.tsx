import { type ComponentProps, type ReactNode, useId } from "react";
import { AnswerShape } from "../icons/AnswerShape.js";
import { CheckIcon } from "../icons/icons.js";
import { ANSWERS, type AnswerShapeName } from "../lib/answers.js";
import { cn } from "../lib/cn.js";

export type EditableAnswer = {
  shape: AnswerShapeName;
  value: string;
  inputLabel: string;
  correctAriaLabel: string;
};

export type AnswerTileEditorProps = Omit<
  ComponentProps<"fieldset">,
  "onChange"
> & {
  legend: ReactNode;
  answers: EditableAnswer[];
  onAnswerChange: (shape: AnswerShapeName, value: string) => void;
  correct: AnswerShapeName | null;
  onCorrectChange: (shape: AnswerShapeName) => void;
  correctLabel: ReactNode;
  markCorrectLabel: ReactNode;
  maxLength?: number | undefined;
  placeholder?: string | undefined;
};

type TileProps = {
  answer: EditableAnswer;
  name: string;
  isCorrect: boolean;
  onAnswerChange: (shape: AnswerShapeName, value: string) => void;
  onCorrectChange: (shape: AnswerShapeName) => void;
  correctLabel: ReactNode;
  markCorrectLabel: ReactNode;
  maxLength: number | undefined;
  placeholder: string | undefined;
};

const Tile = ({
  answer,
  name,
  isCorrect,
  onAnswerChange,
  onCorrectChange,
  correctLabel,
  markCorrectLabel,
  maxLength,
  placeholder,
}: TileProps) => (
  <div
    className={cn(
      "flex min-h-29.5 flex-col gap-2.5 rounded-card border-3 border-ink-950 pt-3 pr-3.5 pb-3.5 pl-4 motion-safe:transition-[rotate,box-shadow]",
      ANSWERS[answer.shape].bg,
      ANSWERS[answer.shape].fg,
      ANSWERS[answer.shape].focus,
      isCorrect
        ? "rotate-[-0.8deg] shadow-brutal-xl focus-within:rotate-0"
        : "shadow-brutal-md",
    )}
  >
    <div className="flex items-center justify-between gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-key text-ink-950">
        <AnswerShape shape={answer.shape} size={26} />
      </span>
      <label
        className={cn(
          "relative flex cursor-pointer items-center gap-1.5 rounded-control border-2 border-ink-950 font-pixel tracking-pixel font-bold text-ink-950",
          "has-focus-visible:outline-3 has-focus-visible:outline-offset- has-focus-visible:outline-(--color-focus)",
          isCorrect
            ? "rotate-[-4deg] bg-sun px-2.5 py-1.25 text-label shadow-brutal-sm"
            : "min-h-8.5 bg-paper-white px-2.5 py-1 text-xs/tight shadow-brutal-sm motion-safe:transition-[translate,box-shadow] active:brutal-pressed",
        )}
      >
        <input
          type="radio"
          name={name}
          value={answer.shape}
          checked={isCorrect}
          onChange={() => onCorrectChange(answer.shape)}
          aria-label={answer.correctAriaLabel}
          className="sr-only"
        />
        {isCorrect && <CheckIcon size={16} strokeWidth={3.2} />}
        <span aria-hidden="true">
          {isCorrect ? correctLabel : markCorrectLabel}
        </span>
      </label>
    </div>
    <input
      type="text"
      aria-label={answer.inputLabel}
      value={answer.value}
      onChange={(event) => onAnswerChange(answer.shape, event.target.value)}
      maxLength={maxLength}
      placeholder={placeholder}
      className="focus-ring h-11 w-full min-w-0 border-b-3 border-current bg-transparent px-0.5 font-display text-title-lg font-extrabold text-inherit placeholder:text-current/60"
    />
  </div>
);

export const AnswerTileEditor = ({
  legend,
  answers,
  onAnswerChange,
  correct,
  onCorrectChange,
  correctLabel,
  markCorrectLabel,
  maxLength,
  placeholder,
  className,
  ...props
}: AnswerTileEditorProps) => {
  const name = useId();
  return (
    <fieldset
      className={cn(
        "m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0",
        className,
      )}
      {...props}
    >
      <legend className="mb-3 p-0 font-pixel tracking-pixel text-label font-bold text-ink-950">
        {legend}
      </legend>
      <div className="grid grid-cols-2 gap-x-5 gap-y-4.5 pr-1.5 pb-1.5">
        {answers.map((answer) => (
          <Tile
            key={answer.shape}
            answer={answer}
            name={name}
            isCorrect={correct === answer.shape}
            onAnswerChange={onAnswerChange}
            onCorrectChange={onCorrectChange}
            correctLabel={correctLabel}
            markCorrectLabel={markCorrectLabel}
            maxLength={maxLength}
            placeholder={placeholder}
          />
        ))}
      </div>
    </fieldset>
  );
};
