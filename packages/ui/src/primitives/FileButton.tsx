import type { VariantProps } from "class-variance-authority";
import type { ChangeEvent, ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { buttonVariants } from "./Button.js";

export type FileButtonProps = VariantProps<typeof buttonVariants> & {
  children: ReactNode;
  onFileSelect: (file: File) => void;
  icon?: ReactNode;
  accept?: string | undefined;
  capture?: "user" | "environment" | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
};

export const FileButton = ({
  children,
  onFileSelect,
  icon,
  accept = "image/*",
  capture,
  disabled = false,
  variant,
  size,
  className,
}: FileButtonProps) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files ?? [];
    if (file) onFileSelect(file);
    event.target.value = "";
  };

  return (
    <label
      data-disabled={disabled ? "" : undefined}
      className={cn(
        buttonVariants({ variant, size }),
        "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-focus",
        className,
      )}
    >
      {icon}
      {children}
      <input
        type="file"
        accept={accept}
        capture={capture}
        disabled={disabled}
        onChange={handleChange}
        className="sr-only"
      />
    </label>
  );
};
