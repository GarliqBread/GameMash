import type { ComponentProps } from "react";
import { cn } from "../lib/cn.js";
import { DRAWING_UNITS, type Drawing, strokeColorVar, strokePath } from "../lib/drawing.js";

export type DrawingFrameProps = Omit<ComponentProps<"div">, "children"> & {
  label: string;
  drawing?: Drawing | undefined;
  src?: string | undefined;
  size?: number | undefined;
};

const DrawingPaths = ({ drawing }: { drawing: Drawing }) => {
  const paths = drawing.strokes.map((stroke, order) => ({
    id: `stroke-${order}`,
    d: strokePath(stroke),
    fill: `var(${strokeColorVar(stroke.color)})`,
  }));
  return (
    <svg viewBox={`0 0 ${DRAWING_UNITS} ${DRAWING_UNITS}`} className="size-full" aria-hidden="true">
      {paths.map((path) => (
        <path key={path.id} d={path.d} fill={path.fill} />
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
