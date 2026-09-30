import { type ComponentProps, type ReactNode, useId } from "react";
import { cn } from "../lib/cn.js";

export type SettingsFieldProps = Omit<ComponentProps<"div">, "children"> & {
  label: ReactNode;
  children: (labelId: string) => ReactNode;
};

export const SettingsField = ({ label, className, children, ...props }: SettingsFieldProps) => {
  const labelId = useId();
  return (
    <div className={cn("flex flex-col gap-2.5", className)} {...props}>
      <span id={labelId} className="text-caption font-bold text-fg-muted workshop:text-body workshop:text-fg">
        {label}
      </span>
      {children(labelId)}
    </div>
  );
};
