import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentProps } from "react";
import { cn } from "../lib/cn.js";
import { type KeyButtonSize, keyButtonClassName } from "./styles.js";

export type KeyButtonProps = Omit<ComponentProps<typeof BaseButton>, "className"> & {
  className?: string | undefined;
  size?: KeyButtonSize | undefined;
};

export const KeyButton = ({ className, size = "square", ...props }: KeyButtonProps) => (
  <BaseButton className={cn(keyButtonClassName({ size }), className)} {...props} />
);
