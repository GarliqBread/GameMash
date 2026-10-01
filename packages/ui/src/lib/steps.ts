import type { ReactNode } from "react";

export const numberedSteps = (steps: ReactNode[]) =>
  steps.map((content, position) => ({ content, number: position + 1 }));
