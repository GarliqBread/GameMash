import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentProps } from "react";
import { cn } from "../lib/cn.js";
import { workshopKeyClassName } from "../lib/workshop.js";

export const keyButtonClassName = cn(
  "focus-ring inline-flex cursor-pointer items-center justify-center text-key data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
  workshopKeyClassName,
);

export type KeyButtonProps = Omit<ComponentProps<typeof BaseButton>, "className"> & {
  className?: string | undefined;
};

export const KeyButton = ({ className, ...props }: KeyButtonProps) => (
  <BaseButton className={cn(keyButtonClassName, "size-12", className)} {...props} />
);
