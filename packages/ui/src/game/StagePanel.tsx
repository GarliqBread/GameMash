import { type ComponentProps, type ReactNode, useId } from "react";
import { cn } from "../lib/cn.js";
import { Heading } from "../primitives/Heading.js";

export type StagePanelProps = Omit<ComponentProps<"section">, "title"> & {
  title?: ReactNode;
  aside?: ReactNode;
};

export const StagePanel = ({ title, aside, className, children, ...props }: StagePanelProps) => {
  const titleId = useId();
  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className={cn(
        "flex min-w-0 flex-col gap-8 rounded-panel border-2 border-border bg-surface px-11 py-10",
        className,
      )}
      {...props}
    >
      {(title || aside) && (
        <div className="flex items-center justify-between gap-6">
          {title && (
            <Heading as="h2" id={titleId} size="stage-section">
              {title}
            </Heading>
          )}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
};
