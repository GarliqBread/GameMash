import type { ComponentProps } from "react";
import { ArrowDownIcon } from "../icons/icons.js";
import { cn } from "../lib/cn.js";

export const LineupConnector = ({ className, ...props }: Omit<ComponentProps<"div">, "children">) => (
  <div aria-hidden="true" className={cn("flex justify-center text-ink-950", className)} {...props}>
    <ArrowDownIcon size={26} />
  </div>
);
