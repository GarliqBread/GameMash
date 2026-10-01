import { Tabs } from "@base-ui/react/tabs";
import type { ComponentProps, ReactNode } from "react";
import { PlusIcon } from "../icons/icons.js";
import { cn } from "../lib/cn.js";
import { IconButton } from "../primitives/IconButton.js";
import { workshopKeyClassName } from "../workshop/styles.js";

export type QuestionTabsProps = Omit<
  ComponentProps<typeof Tabs.Root>,
  "value" | "defaultValue" | "onValueChange" | "children" | "className"
> & {
  questionIds: string[];
  value: string;
  onValueChange: (id: string) => void;
  tabLabel: (position: number, isIncomplete: boolean) => string;
  incompleteIds?: string[] | undefined;
  listLabel: string;
  addLabel: string;
  onAdd: () => void;
  canAdd?: boolean | undefined;
  className?: string | undefined;
  children: ReactNode;
};

export const QuestionTabs = ({
  questionIds,
  value,
  onValueChange,
  tabLabel,
  incompleteIds = [],
  listLabel,
  addLabel,
  onAdd,
  canAdd = true,
  className,
  children,
  ...props
}: QuestionTabsProps) => (
  <Tabs.Root
    value={value}
    onValueChange={(next: string) => onValueChange(next)}
    className={cn("flex min-h-0 flex-col gap-5", className)}
    {...props}
  >
    <div className="flex flex-wrap gap-2 workshop:gap-2.5 workshop:pr-1.5 workshop:pb-1.5">
      <Tabs.List aria-label={listLabel} className="flex flex-wrap gap-2 workshop:gap-2.5">
        {questionIds.map((id, index) => (
          <Tabs.Tab
            key={id}
            value={id}
            aria-label={tabLabel(index + 1, incompleteIds.includes(id))}
            className={cn(
              incompleteIds.includes(id) &&
                "relative after:absolute after:-top-1.5 after:-right-1.5 after:size-3.5 after:rounded-full after:border-2 after:border-ink-950 after:bg-danger",
              "focus-ring size-11 cursor-pointer rounded-control bg-surface-2 font-display text-body font-extrabold text-fg",
              "transition-colors not-data-[active]:hover:bg-border data-[active]:bg-selected data-[active]:text-on-selected",
              workshopKeyClassName,
              "workshop:size-12 workshop:text-key workshop:not-data-[active]:hover:bg-paper-white",
            )}
          >
            {index + 1}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      <IconButton label={addLabel} variant="dashed" disabled={!canAdd} onClick={onAdd} className="workshop:size-12">
        <PlusIcon size={18} />
      </IconButton>
    </div>
    <Tabs.Panel value={value} className="flex min-h-0 flex-1 flex-col">
      {children}
    </Tabs.Panel>
  </Tabs.Root>
);
