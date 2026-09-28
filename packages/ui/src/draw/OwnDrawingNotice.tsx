import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.js";
import type { Drawing } from "../lib/drawing.js";
import { Heading } from "../primitives/Heading.js";
import { DrawingFrame } from "./DrawingFrame.js";

export type OwnDrawingNoticeProps = Omit<ComponentProps<"div">, "children" | "title"> & {
  drawing: Drawing;
  drawingLabel: string;
  badge: ReactNode;
  title: ReactNode;
  description: ReactNode;
};

export const OwnDrawingNotice = ({
  drawing,
  drawingLabel,
  badge,
  title,
  description,
  className,
  ...props
}: OwnDrawingNoticeProps) => (
  <div className={cn("flex flex-col items-center justify-center gap-7 text-center", className)} {...props}>
    <div className="relative -rotate-3">
      <DrawingFrame drawing={drawing} label={drawingLabel} size={220} />
      <span className="absolute -top-4 -right-[18px] rotate-[8deg] rounded-full bg-sun px-3.5 py-1.5 font-display text-body font-extrabold text-ink-950">
        {badge}
      </span>
    </div>
    <Heading as="h2" size="phone">
      {title}
    </Heading>
    <p className="max-w-[300px] text-lg/relaxed text-fg-muted">{description}</p>
  </div>
);
