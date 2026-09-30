import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { Switch } from "../primitives/Switch.js";

export type RuleSwitch = {
  id: string;
  label: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean | undefined;
};

export type RuleSwitchListProps = Omit<ComponentProps<"ul">, "children"> & {
  rules: RuleSwitch[];
  onLabel: ReactNode;
  offLabel: ReactNode;
};

export const RuleSwitchList = ({ rules, onLabel, offLabel, className, ...props }: RuleSwitchListProps) => (
  <ul
    className={cn(
      "flex flex-col divide-y-3 divide-ink-950 overflow-hidden rounded-field border-3 border-ink-950 bg-paper-white",
      className,
    )}
    {...props}
  >
    {rules.map((rule) => (
      <li key={rule.id} className="flex min-h-[60px] items-center py-2 pr-3 pl-3.5">
        <Switch
          label={<span className="font-bold">{rule.label}</span>}
          onLabel={onLabel}
          offLabel={offLabel}
          checked={rule.checked}
          onCheckedChange={rule.onCheckedChange}
          disabled={rule.disabled}
          className="flex-1"
        />
      </li>
    ))}
  </ul>
);
