import { cva } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";

type StepsVariant = "phone" | "violet" | "cards";

const listVariants = cva("m-0 list-none p-0", {
  variants: {
    variant: {
      phone: "flex flex-col gap-2",
      violet: "flex max-w-[380px] flex-col gap-3",
      cards: "grid w-full grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-4",
    },
  },
});

const itemVariants = cva("flex min-w-0", {
  variants: {
    variant: {
      phone: "items-center gap-3 text-base/[1.3]",
      violet: "items-center gap-3.5 text-xl/[1.3]",
      cards:
        "flex-col gap-2.5 rounded-field border-3 border-ink-950 bg-paper-white px-[18px] py-4 text-body/[1.35] font-bold text-ink-950 shadow-brutal",
    },
  },
});

const keyVariants = cva(
  "flex shrink-0 items-center justify-center rounded-key border-2 border-ink-950 font-display font-extrabold text-ink-950",
  {
    variants: {
      variant: {
        phone: "size-[38px] bg-paper-white text-lg shadow-brutal-sm",
        violet: "size-[42px] bg-cream text-xl",
        cards: "size-10 bg-sun text-key",
      },
    },
  },
);

const numberedSteps = (steps: ReactNode[]) => steps.map((content, position) => ({ content, number: position + 1 }));

export type HowItWorksStepsProps = Omit<ComponentProps<"ol">, "children"> & {
  steps: ReactNode[];
  variant: StepsVariant;
};

export const HowItWorksSteps = ({ steps, variant, className, ...props }: HowItWorksStepsProps) => (
  <ol className={cn(listVariants({ variant }), className)} {...props}>
    {numberedSteps(steps).map((step) => (
      <li key={step.number} className={itemVariants({ variant })}>
        <span aria-hidden="true" className={keyVariants({ variant })}>
          {step.number}
        </span>
        <span className="min-w-0">{step.content}</span>
      </li>
    ))}
  </ol>
);
