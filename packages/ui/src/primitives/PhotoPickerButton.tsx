import { type ChangeEvent, type ComponentProps, type ReactNode, useId } from "react";
import { CameraIcon } from "../icons/icons.js";
import { cn } from "../lib/cn.js";

export type PhotoPickerButtonProps = Omit<ComponentProps<"div">, "children"> & {
  label: ReactNode;
  hint?: ReactNode;
  previewSrc?: string | undefined;
  onFileSelect: (file: File) => void;
  accept?: string | undefined;
  capture?: "user" | "environment" | undefined;
  disabled?: boolean | undefined;
};

export const PhotoPickerButton = ({
  label,
  hint,
  previewSrc,
  onFileSelect,
  accept = "image/*",
  capture,
  disabled = false,
  className,
  ...props
}: PhotoPickerButtonProps) => {
  const inputId = useId();
  const hintId = useId();
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files ?? [];
    if (file) onFileSelect(file);
    event.target.value = "";
  };

  return (
    <div className={cn("flex items-center gap-4", className)} {...props}>
      <label
        htmlFor={inputId}
        className={cn(
          "flex size-[76px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-fg-subtle bg-surface text-fg",
          "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-focus",
          previewSrc && "border-solid",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {previewSrc ? <img src={previewSrc} alt="" className="size-full object-cover" /> : <CameraIcon size={30} />}
        <input
          id={inputId}
          type="file"
          accept={accept}
          capture={capture}
          aria-describedby={hint ? hintId : undefined}
          disabled={disabled}
          onChange={handleChange}
          className="sr-only"
        />
      </label>
      <div className="flex min-w-0 flex-col gap-0.5">
        <label htmlFor={inputId} className="cursor-pointer text-body font-bold">
          {label}
        </label>
        {hint && (
          <span id={hintId} className="text-caption/snug text-fg-subtle">
            {hint}
          </span>
        )}
      </div>
    </div>
  );
};
