import { Field } from "@base-ui/react/field";
import type { ComponentProps } from "react";
import { FieldFrame, type FieldFrameProps } from "./FieldFrame.js";

const DEFAULT_LENGTH = 4;

const normalizeRoomCode = (raw: string, length: number) =>
  raw
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, length);

export type RoomCodeInputProps = Omit<
  ComponentProps<typeof Field.Control>,
  "className" | "value" | "defaultValue" | "onValueChange" | "onChange" | "size" | "maxLength"
> &
  Omit<FieldFrameProps, "children" | "hideLabel"> & {
    value: string;
    onValueChange: (value: string) => void;
    length?: number | undefined;
  };

export const RoomCodeInput = ({
  label,
  description,
  error,
  disabled,
  className,
  value,
  onValueChange,
  length = DEFAULT_LENGTH,
  ...props
}: RoomCodeInputProps) => (
  <FieldFrame label={label} description={description} error={error} disabled={disabled} className={className}>
    <Field.Control
      value={value}
      onValueChange={(next) => onValueChange(normalizeRoomCode(next, length))}
      pattern={`[A-Za-z]{${length}}`}
      inputMode="text"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="characters"
      spellCheck={false}
      enterKeyHint="go"
      className="focus-ring h-[76px] w-full min-w-0 rounded-button border-2 border-fg bg-field pl-[0.35em] text-center font-display text-stage-xl font-extrabold uppercase tracking-[0.35em] text-fg data-[invalid]:border-danger data-[disabled]:opacity-50"
      {...props}
    />
  </FieldFrame>
);
