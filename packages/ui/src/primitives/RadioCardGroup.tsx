import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";

export type RadioCardOption<Value extends string> = {
  value: Value;
  label: ReactNode;
  ariaLabel?: string | undefined;
  className?: string | undefined;
  disabled?: boolean | undefined;
};

export type RadioCardGroupProps<Value extends string> = Omit<
  ComponentProps<typeof RadioGroup>,
  "value" | "defaultValue" | "onValueChange" | "className" | "children"
> & {
  options: RadioCardOption<Value>[];
  value: Value | null;
  onValueChange: (value: Value) => void;
  className?: string | undefined;
  itemClassName?: string | undefined;
};

const radioCardClassName = cn(
  "focus-ring flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-field border-2 border-border bg-surface",
  "font-display font-extrabold text-fg transition-colors duration-100 not-data-[disabled]:hover:border-border-strong",
  "data-[checked]:border-primary data-[checked]:bg-primary data-[checked]:text-on-primary",
  "not-data-[disabled]:data-[checked]:hover:border-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
);

export const RadioCardGroup = <Value extends string>({
  options,
  value,
  onValueChange,
  className,
  itemClassName,
  ...props
}: RadioCardGroupProps<Value>) => (
  <RadioGroup<Value | null>
    value={value}
    onValueChange={(next) => {
      if (next !== null) onValueChange(next);
    }}
    className={cn("flex flex-wrap gap-2.5", className)}
    {...props}
  >
    {options.map((option) => (
      <Radio.Root
        key={option.value}
        value={option.value}
        disabled={option.disabled}
        aria-label={option.ariaLabel}
        className={cn(radioCardClassName, itemClassName, option.className)}
      >
        {option.label}
      </Radio.Root>
    ))}
  </RadioGroup>
);
