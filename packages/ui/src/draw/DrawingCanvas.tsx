import type { ComponentProps } from "react";
import { cn } from "../lib/cn.js";
import type { DrawingController } from "./useDrawing.js";

export type DrawingCanvasProps = Omit<
  ComponentProps<"canvas">,
  "ref" | "children" | "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel" | "onLostPointerCapture"
> & {
  controller: DrawingController;
  label: string;
};

export const DrawingCanvas = ({ controller, label, className, ...props }: DrawingCanvasProps) => (
  <canvas
    role="img"
    aria-label={label}
    className={cn(
      "aspect-square w-full touch-none select-none rounded-card bg-canvas [-webkit-touch-callout:none]",
      className,
    )}
    {...props}
    {...controller.canvasProps}
  />
);
