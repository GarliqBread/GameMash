import { Children, type ComponentProps, isValidElement } from "react";
import { cn } from "../lib/cn.js";
import { gridColumns } from "../lib/grid.js";

export type PlayerGridProps = ComponentProps<"ul"> & {
  columns: number;
};

export const PlayerGrid = ({ columns, children, className, style, ...props }: PlayerGridProps) => (
  <ul className={cn("grid gap-x-6 gap-y-5", className)} style={{ ...gridColumns(columns), ...style }} {...props}>
    {Children.map(children, (child) =>
      isValidElement(child) ? <li className="min-w-0 animate-pop-in">{child}</li> : null,
    )}
  </ul>
);
