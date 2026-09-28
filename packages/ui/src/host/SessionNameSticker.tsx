import { Field } from "@base-ui/react/field";
import type { ComponentProps, ReactNode } from "react";
import { PencilIcon } from "../icons/icons.js";
import { cn } from "../lib/cn.js";

export type SessionNameStickerProps = Omit<ComponentProps<typeof Field.Control>, "className"> & {
  label: ReactNode;
  className?: string | undefined;
};

export const SessionNameSticker = ({ label, className, ...props }: SessionNameStickerProps) => (
  <Field.Root
    className={cn(
      "flex min-w-0 -rotate-[1.5deg] items-center gap-3 rounded-control border-3 border-ink-950 bg-brand-blue py-1.5 pr-3 pl-4 text-ink-950 shadow-brutal",
      "motion-safe:transition-transform focus-within:rotate-0",
      className,
    )}
  >
    <Field.Label className="shrink-0 font-pixel tracking-pixel text-xs font-bold">{label}</Field.Label>
    <Field.Control
      className="h-10 w-[250px] min-w-0 bg-transparent font-display text-2xl font-extrabold text-ink-950 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-ink-950"
      {...props}
    />
    <PencilIcon size={20} strokeWidth={2.2} className="shrink-0" />
  </Field.Root>
);
