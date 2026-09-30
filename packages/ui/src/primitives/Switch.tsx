import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { type ComponentProps, type ReactNode, useId } from "react";
import { cn } from "../lib/cn.js";

export type SwitchProps = Omit<ComponentProps<typeof BaseSwitch.Root>, "className"> & {
  label?: ReactNode;
  onLabel?: ReactNode;
  offLabel?: ReactNode;
  className?: string | undefined;
};

const stateLabelClassName = cn(
  "hidden col-start-1 row-start-1 min-w-0 px-1 text-center font-pixel tracking-pixel text-xs font-bold text-ink-950",
  "workshop:block workshop:pl-[34px] workshop:group-data-[checked]:pr-[34px] workshop:group-data-[checked]:pl-1",
);

export const Switch = ({ label, onLabel, offLabel, className, id, ...props }: SwitchProps) => {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const control = (
    <BaseSwitch.Root
      id={controlId}
      className={cn(
        "group focus-ring relative flex h-[34px] w-14 shrink-0 cursor-pointer rounded-full bg-ink-300 p-1",
        "transition-colors duration-150 data-[checked]:bg-success data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        "workshop:grid workshop:h-9 workshop:w-fit workshop:min-w-[78px] workshop:items-center workshop:rounded-key workshop:brutal workshop:bg-sand-200 workshop:p-[2px]",
        !label && className,
      )}
      {...props}
    >
      <span
        className={cn(
          "contents",
          "workshop:pointer-events-none workshop:absolute workshop:inset-y-[2px] workshop:right-[28px] workshop:left-[2px] workshop:block",
          "workshop:transition-transform workshop:duration-150 workshop:ease-out workshop:group-data-[checked]:translate-x-full",
        )}
      >
        <BaseSwitch.Thumb
          className={cn(
            "size-[26px] rounded-full bg-cream shadow-knob transition-transform duration-150 ease-out data-[checked]:translate-x-[22px]",
            "workshop:block workshop:rounded-sticker workshop:border-3 workshop:border-ink-950 workshop:bg-paper-white workshop:shadow-none workshop:data-[checked]:translate-x-0",
          )}
        />
      </span>
      {onLabel && (
        <span
          aria-hidden="true"
          className={cn(stateLabelClassName, "workshop:invisible workshop:group-data-[checked]:visible")}
        >
          {onLabel}
        </span>
      )}
      {offLabel && (
        <span aria-hidden="true" className={cn(stateLabelClassName, "workshop:group-data-[checked]:invisible")}>
          {offLabel}
        </span>
      )}
    </BaseSwitch.Root>
  );

  if (!label) return control;

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <label
        htmlFor={controlId}
        className="min-w-0 flex-1 cursor-pointer text-base/snug text-fg hyphens-auto wrap-break-word [hyphenate-limit-chars:10_4_4]"
      >
        {label}
      </label>
      {control}
    </div>
  );
};
