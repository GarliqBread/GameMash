import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { SectionTab } from "./SectionTab.js";

export type RulesPanelProps = Omit<ComponentProps<"div">, "title"> & {
  title: ReactNode;
};

export const RulesPanel = ({ title, className, children, ...props }: RulesPanelProps) => {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 self-start rounded-card border-3 border-ink-950 bg-lavender p-[22px] shadow-brutal-xl",
        className,
      )}
      {...props}
    >
      <SectionTab>{title}</SectionTab>
      {children}
    </div>
  );
};
