import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { workshopKeyClassName } from "../workshop/styles.js";

export type SegmentedOption<Value extends string> = {
  value: Value;
  label: ReactNode;
  ariaLabel?: string | undefined;
  disabled?: boolean | undefined;
};

export type SegmentedControlProps<Value extends string> = Omit<
  ComponentProps<typeof ToggleGroup>,
  "value" | "defaultValue" | "onValueChange" | "multiple" | "className" | "children"
> & {
  options: SegmentedOption<Value>[];
  value: Value;
  onValueChange: (value: Value) => void;
  className?: string | undefined;
  itemClassName?: string | undefined;
};

export const SegmentedControl = <Value extends string>({
  options,
  value,
  onValueChange,
  className,
  itemClassName,
  ...props
}: SegmentedControlProps<Value>) => (
  <ToggleGroup
    value={[value]}
    onValueChange={(next: Value[]) => {
      const [selected] = next;
      if (selected !== undefined) onValueChange(selected);
    }}
    className={cn(
      "grid auto-cols-fr grid-flow-col gap-1.5 rounded-field bg-surface-2 p-1",
      "workshop:gap-2 workshop:bg-transparent workshop:p-0 workshop:pr-1 workshop:pb-1",
      className,
    )}
    {...props}
  >
    {options.map((option) => (
      <Toggle
        key={option.value}
        value={option.value}
        aria-label={option.ariaLabel}
        disabled={option.disabled}
        className={cn(
          "focus-ring flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-control px-3 py-1.5 text-center text-control/tight font-bold text-fg-muted",
          "transition-colors duration-100 not-data-[disabled]:hover:text-fg data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          "data-[pressed]:bg-selected data-[pressed]:text-on-selected not-data-[disabled]:data-[pressed]:hover:text-on-selected",
          workshopKeyClassName,
          "workshop:min-h-[50px] workshop:px-1 workshop:py-1 workshop:text-control-lg/tight",
          itemClassName,
        )}
      >
        {option.label}
      </Toggle>
    ))}
  </ToggleGroup>
);
