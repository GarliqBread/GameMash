import { Field } from "@base-ui/react/field";
import type { ComponentProps } from "react";
import { cn } from "../lib/cn.js";
import { FieldFrame, type FieldFrameProps } from "./FieldFrame.js";

export type TextAreaProps = Omit<ComponentProps<typeof Field.Control>, "className" | "render"> &
  Omit<FieldFrameProps, "children"> & {
    rows?: number | undefined;
    controlClassName?: string | undefined;
  };

export const TextArea = ({
  label,
  hideLabel,
  description,
  error,
  disabled,
  className,
  controlClassName,
  rows = 2,
  ...props
}: TextAreaProps) => (
  <FieldFrame
    label={label}
    hideLabel={hideLabel}
    description={description}
    error={error}
    disabled={disabled}
    className={className}
  >
    <Field.Control
      render={<textarea rows={rows} />}
      className={cn(
        "focus-ring w-full min-w-0 resize-none rounded-field border-2 border-border-strong bg-field px-4 py-3.5 text-fg placeholder:text-fg-subtle",
        "transition-colors data-[invalid]:border-danger data-[disabled]:opacity-50",
        "workshop:brutal workshop:bg-paper-white workshop:shadow-brutal-md",
        controlClassName,
      )}
      {...props}
    />
  </FieldFrame>
);
