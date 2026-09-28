import { Field } from "@base-ui/react/field";
import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";

export type FieldFrameProps = {
  label: ReactNode;
  hideLabel?: boolean | undefined;
  description?: ReactNode;
  error?: ReactNode;
  disabled?: boolean | undefined;
  className?: string | undefined;
  children: ReactNode;
};

const hasError = (error: ReactNode) => error !== undefined && error !== null && error !== false && error !== "";

export const FieldFrame = ({
  label,
  hideLabel = false,
  description,
  error,
  disabled = false,
  className,
  children,
}: FieldFrameProps) => (
  <Field.Root invalid={hasError(error)} disabled={disabled} className={cn("flex min-w-0 flex-col gap-2", className)}>
    <Field.Label className={cn("text-body font-bold text-fg", hideLabel && "sr-only")}>{label}</Field.Label>
    {children}
    {description && <Field.Description className="text-caption text-fg-subtle">{description}</Field.Description>}
    {hasError(error) && (
      <Field.Error match className="text-caption font-bold text-danger">
        {error}
      </Field.Error>
    )}
  </Field.Root>
);
