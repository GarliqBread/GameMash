import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { cva, type VariantProps } from "class-variance-authority";
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
> &
  VariantProps<typeof radioCardVariants> & {
    options: RadioCardOption<Value>[];
    value: Value | null;
    onValueChange: (value: Value) => void;
    className?: string | undefined;
    itemClassName?: string | undefined;
  };

const radioCardVariants = cva(
  [
    "focus-ring flex cursor-pointer items-center justify-center rounded-field border-2 border-border bg-surface",
    "text-fg transition-colors duration-100 not-data-[disabled]:hover:border-border-strong",
    "data-[checked]:border-primary data-[checked]:bg-primary data-[checked]:text-on-primary",
    "not-data-[disabled]:data-[checked]:hover:border-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
  ],
  {
    variants: {
      size: {
        md: "min-h-12 min-w-12 font-display font-extrabold",
        sm: cn(
          "h-8.5 px-2.5 font-pixel text-label-sm font-bold tracking-pixel",
          "workshop:rounded-key workshop:border-3 workshop:border-ink-950 workshop:bg-paper-white workshop:text-ink-950 workshop:shadow-brutal-sm",
          "workshop:data-[checked]:border-ink-950 workshop:data-[checked]:bg-sun workshop:data-[checked]:text-ink-950 workshop:data-[checked]:brutal-pressed",
          "workshop:not-data-[disabled]:hover:border-ink-950",
        ),
      },
    },
    defaultVariants: { size: "md" },
  },
);

export const RadioCardGroup = <Value extends string>({
  options,
  value,
  onValueChange,
  size,
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
        className={cn(radioCardVariants({ size }), itemClassName, option.className)}
      >
        {option.label}
      </Radio.Root>
    ))}
  </RadioGroup>
);
