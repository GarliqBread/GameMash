import { type ComponentProps, useLayoutEffect, useRef, useState } from "react";
import { cn } from "../lib/cn.js";

const STAGE_WIDTH = 1920;
const STAGE_HEIGHT = 1080;

const fitScale = (width: number, height: number) => Math.min(width / STAGE_WIDTH, height / STAGE_HEIGHT);

export type StageViewportProps = Omit<ComponentProps<"div">, "ref">;

export const StageViewport = ({ className, children, ...props }: StageViewportProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => setScale(fitScale(container.clientWidth, container.clientHeight));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      data-theme="stage"
      className={cn("relative h-dvh w-full overflow-hidden bg-bg text-fg", className)}
      {...props}
    >
      <div
        className="absolute top-1/2 left-1/2 origin-center"
        style={{
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          transform: `translate(-50%, -50%) scale(${scale})`,
          visibility: scale === 0 ? "hidden" : "visible",
        }}
      >
        {children}
      </div>
    </div>
  );
};
