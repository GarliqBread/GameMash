import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentProps } from "react";
import { AnswerShape } from "../icons/AnswerShape.js";
import { ANSWERS, type AnswerOption, type AnswerShapeName } from "../lib/answers.js";
import { cn } from "../lib/cn.js";

export type AnswerButtonState = "idle" | "selected" | "faded" | "locked";

export type AnswerButtonProps = Omit<ComponentProps<typeof BaseButton>, "className" | "children" | "onClick"> & {
  shape: AnswerShapeName;
  label: string;
  state?: AnswerButtonState | undefined;
  shapeLabel: string;
  onAnswer: (shape: AnswerShapeName) => void;
  className?: string | undefined;
};

export const AnswerButton = ({
  shape,
  label,
  state = "idle",
  shapeLabel,
  onAnswer,
  className,
  ...props
}: AnswerButtonProps) => (
  <BaseButton
    aria-pressed={state === "selected"}
    disabled={state !== "idle"}
    focusableWhenDisabled={state === "selected"}
    onClick={() => onAnswer(shape)}
    className={cn(
      "focus-ring flex min-h-16 w-full min-w-0 flex-1 cursor-pointer items-center gap-[22px] rounded-tile px-6 py-3 text-left",
      "transition-[opacity,scale] duration-150 not-data-[disabled]:active:scale-[0.98] data-[disabled]:cursor-default",
      ANSWERS[shape].bg,
      ANSWERS[shape].fg,
      state === "selected" && "ring-4 ring-cream ring-offset-4 ring-offset-bg",
      state === "faded" && "opacity-30",
      className,
    )}
    {...props}
  >
    <AnswerShape shape={shape} size={64} label={shapeLabel} className="shrink-0" />
    <span className="min-w-0 font-display text-heading leading-[1.1] font-extrabold hyphens-auto wrap-break-word">
      {label}
    </span>
  </BaseButton>
);

const buttonState = (
  shape: AnswerShapeName,
  selected: AnswerShapeName | undefined,
  locked: boolean,
): AnswerButtonState => {
  if (selected === shape) return "selected";
  if (selected) return "faded";
  return locked ? "locked" : "idle";
};

export type AnswerButtonGroupProps = Omit<ComponentProps<"ul">, "children"> & {
  options: AnswerOption[];
  onAnswer: (shape: AnswerShapeName) => void;
  selected?: AnswerShapeName | undefined;
  locked?: boolean | undefined;
};

export const AnswerButtonGroup = ({
  options,
  selected,
  locked = false,
  onAnswer,
  className,
  ...props
}: AnswerButtonGroupProps) => (
  <ul className={cn("flex min-h-0 min-w-0 flex-1 flex-col gap-3", className)} {...props}>
    {options.map((option) => (
      <li key={option.shape} className="flex min-h-16 flex-1">
        <AnswerButton
          shape={option.shape}
          label={option.label}
          shapeLabel={option.shapeLabel}
          state={buttonState(option.shape, selected, locked)}
          onAnswer={onAnswer}
        />
      </li>
    ))}
  </ul>
);
