import type { ComponentProps } from "react";
import { cn } from "../lib/cn.js";

const RATINGS = Array.from({ length: 10 }, (_, index) => index + 1);

export const RatingScalePreview = ({ className, ...props }: Omit<ComponentProps<"div">, "children">) => (
  <div aria-hidden="true" className={cn("grid max-w-[760px] grid-cols-10 gap-2.5", className)} {...props}>
    {RATINGS.map((rating) => (
      <span
        key={rating}
        className="flex h-16 items-center justify-center rounded-field border-2 border-border bg-surface font-display text-stage-body font-extrabold"
      >
        {rating}
      </span>
    ))}
  </div>
);
