import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { NumberedSteps } from "../lib/NumberedSteps.js";

export type JoinStepsProps = ComponentProps<"div"> & {
  steps: ReactNode[];
  qr?: ReactNode;
  qrCaption?: ReactNode;
};

export const JoinSteps = ({ steps, children, qr, qrCaption, className, ...props }: JoinStepsProps) => (
  <div className={cn("flex flex-col gap-10", className)} {...props}>
    <NumberedSteps
      steps={steps}
      className="flex flex-col gap-5"
      itemClassName="flex items-center gap-5 text-stage-lg text-fg-muted"
      numberClassName="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-cream font-display text-stage-body font-extrabold text-ink-950"
    />
    {children}
    {qr && (
      <div className="flex items-center gap-7">
        {qr}
        {qrCaption && <span className="max-w-[480px] text-stage-lg text-fg-muted">{qrCaption}</span>}
      </div>
    )}
  </div>
);
