import type { ComponentProps, ReactNode } from "react";

export type NumberedStepsProps = Omit<ComponentProps<"ol">, "children"> & {
  steps: ReactNode[];
  itemClassName?: string | undefined;
  numberClassName?: string | undefined;
};

export const NumberedSteps = ({ steps, itemClassName, numberClassName, ...props }: NumberedStepsProps) => (
  <ol {...props}>
    {steps
      .map((content, position) => ({ content, number: position + 1 }))
      .map((step) => (
        <li key={step.number} className={itemClassName}>
          <span aria-hidden="true" className={numberClassName}>
            {step.number}
          </span>
          <span className="min-w-0">{step.content}</span>
        </li>
      ))}
  </ol>
);
