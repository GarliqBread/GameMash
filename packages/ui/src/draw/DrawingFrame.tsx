import type { ComponentProps } from "react";
import { cn } from "../lib/cn.js";
import { DRAWING_UNITS, type Drawing, isFill, markColorVar, markPath } from "../lib/drawing.js";

export type DrawingFrameProps = Omit<ComponentProps<"div">, "children"> & {
  label: string;
  drawing?: Drawing | undefined;
  src?: string | undefined;
  size?: number | undefined;
};

const DrawingPaths = ({ drawing }: { drawing: Drawing }) => {
  const paths = drawing.strokes.map((mark, order) => ({
    id: `mark-${order}`,
    d: markPath(mark),
    fill: `var(${markColorVar(mark.color)})`,
    fillRule: isFill(mark) ? ("evenodd" as const) : ("nonzero" as const),
  }));
  return (
    <svg viewBox={`0 0 ${DRAWING_UNITS} ${DRAWING_UNITS}`} className="size-full" aria-hidden="true">
      {paths.map((path) => (
        <path key={path.id} d={path.d} fill={path.fill} fillRule={path.fillRule} />
      ))}
    </svg>
  );
};

export const DrawingFrame = ({ label, drawing, src, size = 250, className, style, ...props }: DrawingFrameProps) => (
  <div
    role="img"
    aria-label={label}
    className={cn("shrink-0 overflow-hidden rounded-card bg-canvas", className)}
    style={{ width: size, height: size, ...style }}
    {...props}
  >
    {drawing && <DrawingPaths drawing={drawing} />}
    {!drawing && src && <img src={src} alt="" className="size-full object-contain" />}
  </div>
);
