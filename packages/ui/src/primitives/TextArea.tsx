import { Field } from "@base-ui/react/field";
import type { ComponentProps } from "react";
import { cn } from "../lib/cn.js";
import { FieldFrame, type FieldFrameProps } from "./FieldFrame.js";
import { fieldControlClassName } from "./field-control.js";

export type TextAreaProps = Omit<ComponentProps<"textarea">, "className" | "children"> &
  Omit<FieldFrameProps, "children"> & {
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
  rows = 6,
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
      render={<textarea rows={rows} {...props} />}
      className={cn(fieldControlClassName, "resize-y rounded-control px-3.5 py-3 text-body", controlClassName)}
    />
  </FieldFrame>
);
