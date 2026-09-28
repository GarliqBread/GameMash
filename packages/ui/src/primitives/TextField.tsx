import { Field } from "@base-ui/react/field";
import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../lib/cn.js";
import { FieldFrame, type FieldFrameProps } from "./FieldFrame.js";

const textFieldControlVariants = cva(
  [
    "focus-ring w-full min-w-0 border-2 border-border-strong bg-field text-fg placeholder:text-fg-subtle",
    "transition-colors data-[invalid]:border-danger data-[disabled]:opacity-50",
    "workshop:brutal workshop:bg-paper-white workshop:shadow-brutal-md",
  ],
  {
    variants: {
      size: {
        phone: "h-[60px] rounded-field px-4 text-xl",
        host: "h-12 rounded-control px-3.5 text-lg",
      },
    },
    defaultVariants: {
      size: "phone",
    },
  },
);

export type TextFieldProps = Omit<ComponentProps<typeof Field.Control>, "className" | "size"> &
  Omit<FieldFrameProps, "children"> & {
    size?: "phone" | "host" | undefined;
    controlClassName?: string | undefined;
  };

export const TextField = ({
  label,
  hideLabel,
  description,
  error,
  disabled,
  size = "phone",
  className,
  controlClassName,
  ...props
}: TextFieldProps) => (
  <FieldFrame
    label={label}
    hideLabel={hideLabel}
    description={description}
    error={error}
    disabled={disabled}
    className={className}
  >
    <Field.Control className={cn(textFieldControlVariants({ size }), controlClassName)} {...props} />
  </FieldFrame>
);
