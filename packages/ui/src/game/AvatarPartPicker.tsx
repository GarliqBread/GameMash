import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Tabs } from "@base-ui/react/tabs";
import type { ReactNode } from "react";
import { CheckIcon } from "../icons/icons.js";
import { cn } from "../lib/cn.js";

export type AvatarPartTab<Tab extends string> = {
  value: Tab;
  label: ReactNode;
};

export type AvatarPartOption = {
  value: string;
  src: string;
  label: string;
  caption?: ReactNode;
};

export type AvatarPartPickerProps<Tab extends string> = {
  tabs: AvatarPartTab<Tab>[];
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  tabsLabel: string;
  options: AvatarPartOption[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean | undefined;
  className?: string | undefined;
};

export const AvatarPartPicker = <Tab extends string>({
  tabs,
  tab,
  onTabChange,
  tabsLabel,
  options,
  value,
  onValueChange,
  disabled = false,
  className,
}: AvatarPartPickerProps<Tab>) => (
  <Tabs.Root
    value={tab}
    onValueChange={(next: Tab) => onTabChange(next)}
    className={cn("flex min-w-0 flex-col gap-4", className)}
  >
    <Tabs.List
      aria-label={tabsLabel}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((option) => (
        <Tabs.Tab
          key={option.value}
          value={option.value}
          className={cn(
            "focus-ring min-h-11 shrink-0 cursor-pointer rounded-full bg-surface-2 px-4 text-body font-bold whitespace-nowrap text-fg-muted",
            "transition-colors duration-100 not-data-[active]:hover:text-fg",
            "data-[active]:bg-selected data-[active]:text-on-selected",
          )}
        >
          {option.label}
        </Tabs.Tab>
      ))}
    </Tabs.List>
    <Tabs.Panel value={tab}>
      <RadioGroup<string>
        value={value}
        onValueChange={(next) => onValueChange(next)}
        disabled={disabled}
        className="grid grid-cols-4 gap-2.5"
      >
        {options.map((option) => (
          <Radio.Root
            key={option.value}
            value={option.value}
            aria-label={option.label}
            className={cn(
              "group focus-ring relative flex aspect-square cursor-pointer items-center justify-center rounded-field border-2 border-border bg-surface",
              "transition-[border-color,translate] duration-100 not-data-[disabled]:not-data-[checked]:hover:border-border-strong",
              "motion-safe:not-data-[disabled]:active:translate-y-0.5",
              "data-[checked]:border-selected data-[checked]:bg-surface-2",
              "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
            )}
          >
            <img src={option.src} alt="" decoding="async" className="size-full object-contain p-1" />
            {option.caption && (
              <span className="absolute inset-x-1 bottom-1 truncate rounded-full bg-bg px-1.5 text-center text-caption font-bold text-fg">
                {option.caption}
              </span>
            )}
            <span
              aria-hidden="true"
              className="absolute -top-2 -right-2 hidden size-6 items-center justify-center rounded-full bg-selected text-on-selected group-data-[checked]:flex"
            >
              <CheckIcon size={14} strokeWidth={3} />
            </span>
          </Radio.Root>
        ))}
      </RadioGroup>
    </Tabs.Panel>
  </Tabs.Root>
);
