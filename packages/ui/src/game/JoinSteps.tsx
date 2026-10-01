import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { numberedSteps } from "../lib/steps.js";

export type JoinStepsProps = ComponentProps<"div"> & {
  steps: ReactNode[];
  qr?: ReactNode;
  qrCaption?: ReactNode;
};

export const JoinSteps = ({ steps, children, qr, qrCaption, className, ...props }: JoinStepsProps) => (
  <div className={cn("flex flex-col gap-10", className)} {...props}>
    <ol className="flex flex-col gap-5">
      {numberedSteps(steps).map((step) => (
        <li key={step.number} className="flex items-center gap-5 text-stage-lg text-fg-muted">
          <span
            aria-hidden="true"
            className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-cream font-display text-stage-body font-extrabold text-ink-950"
          >
            {step.number}
          </span>
          <span className="min-w-0">{step.content}</span>
        </li>
      ))}
    </ol>
    {children}
    {qr && (
      <div className="flex items-center gap-7">
        {qr}
        {qrCaption && <span className="max-w-[480px] text-stage-lg text-fg-muted">{qrCaption}</span>}
      </div>
    )}
  </div>
);
