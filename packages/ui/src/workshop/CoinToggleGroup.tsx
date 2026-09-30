import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";

export type CoinOption<Value extends string> = {
  value: Value;
  label: ReactNode;
  ariaLabel?: string | undefined;
};

export type CoinToggleGroupProps<Value extends string> = Omit<
  ComponentProps<typeof ToggleGroup>,
  "value" | "defaultValue" | "onValueChange" | "multiple" | "className" | "children"
> & {
  options: CoinOption<Value>[];
  value: Value;
  onValueChange: (value: Value) => void;
  className?: string | undefined;
};

export const CoinToggleGroup = <Value extends string>({
  options,
  value,
  onValueChange,
  className,
  ...props
}: CoinToggleGroupProps<Value>) => (
  <ToggleGroup
    value={[value]}
    onValueChange={(next: Value[]) => {
      const [selected] = next;
      if (selected !== undefined) onValueChange(selected);
    }}
    className={cn("flex flex-wrap gap-4 pr-1 pb-1", className)}
    {...props}
  >
    {options.map((option) => (
      <Toggle
        key={option.value}
        value={option.value}
        aria-label={option.ariaLabel}
        className={cn(
          "focus-ring flex size-18.5 cursor-pointer items-center justify-center rounded-full border-3 border-ink-950 bg-paper-white",
          "px-1 text-center font-pixel tracking-pixel text-caption font-bold text-ink-950 shadow-brutal",
          "motion-safe:transition-[translate,box-shadow,background-color]",
          "data-pressed:translate-x-0.75 data-pressed:translate-y-0.75 data-pressed:bg-sun data-pressed:shadow-brutal-xs",
          "data-pressed:ring-4 data-pressed:ring-sun-deep data-pressed:ring-inset",
        )}
      >
        {option.label}
      </Toggle>
    ))}
  </ToggleGroup>
);
