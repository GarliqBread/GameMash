import { Field } from "@base-ui/react/field";
import { type ComponentProps, type ReactNode, useId } from "react";
import { cn } from "../lib/cn.js";

const WARNING_SHARE = 0.9;

export type QuestionFieldProps = Omit<
  ComponentProps<typeof Field.Control>,
  "className" | "render" | "value" | "onValueChange" | "maxLength"
> & {
  label: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  maxLength: number;
  counterLabel: (length: number, maxLength: number) => ReactNode;
  rows?: number | undefined;
  className?: string | undefined;
};

export const QuestionField = ({
  label,
  value,
  onValueChange,
  maxLength,
  counterLabel,
  rows = 2,
  className,
  ...props
}: QuestionFieldProps) => {
  const counterId = useId();
  const length = value.length;
  const isNearLimit = length >= maxLength * WARNING_SHARE;
  return (
    <Field.Root className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Field.Label className="font-pixel tracking-pixel text-label font-bold text-ink-950">{label}</Field.Label>
        <span
          id={counterId}
          className={cn(
            "font-pixel tracking-pixel text-xs tabular-nums",
            isNearLimit ? "font-bold text-danger" : "text-fg-subtle",
          )}
        >
          {counterLabel(length, maxLength)}
        </span>
      </div>
      <Field.Control
        render={<textarea rows={rows} maxLength={maxLength} />}
        value={value}
        onValueChange={onValueChange}
        aria-describedby={counterId}
        className={cn(
          "focus-ring w-full resize-none rounded-field border-3 border-ink-950 bg-paper-white px-[18px] py-3.5",
          "font-display text-title-lg/[1.2] font-extrabold text-ink-950 shadow-brutal-md",
        )}
        {...props}
      />
    </Field.Root>
  );
};
