import { type ComponentProps, useState } from "react";
import { cn } from "../lib/cn.js";

const WARNING_SECONDS = 5;

type TimerRingSize = 148 | 112;

const GEOMETRY: Record<TimerRingSize, { radius: number; stroke: number; text: string }> = {
  148: { radius: 62, stroke: 14, text: "text-stage-2xl" },
  112: { radius: 46, stroke: 12, text: "text-stage-xl" },
};

const timerProgress = (seconds: number, total: number) => (total <= 0 ? 0 : Math.min(1, Math.max(0, seconds / total)));

const useIsCountingDown = (seconds: number) => {
  const [previous, setPrevious] = useState(seconds);
  const [isCountingDown, setIsCountingDown] = useState(true);
  if (seconds !== previous) {
    setPrevious(seconds);
    setIsCountingDown(seconds < previous);
  }
  return isCountingDown;
};

export type TimerRingProps = Omit<ComponentProps<"div">, "children"> & {
  seconds: number;
  total: number;
  label: string;
  warningLabel?: string | undefined;
  size?: TimerRingSize | undefined;
};

export const TimerRing = ({ seconds, total, label, warningLabel, size = 148, className, ...props }: TimerRingProps) => {
  const { radius, stroke, text } = GEOMETRY[size];
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const isWarning = seconds > 0 && seconds <= WARNING_SECONDS;
  const isCountingDown = useIsCountingDown(seconds);

  return (
    <div
      role="timer"
      aria-label={label}
      className={cn("relative shrink-0", isWarning && "animate-timer-pulse", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={center} cy={center} r={radius} fill="none" strokeWidth={stroke} className="stroke-surface-2" />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - timerProgress(seconds, total))}
          transform={`rotate(-90 ${center} ${center})`}
          className={cn("stroke-sun", isCountingDown && "transition-[stroke-dashoffset] duration-1000 ease-linear")}
        />
      </svg>
      <span
        aria-hidden="true"
        className={cn("absolute inset-0 flex items-center justify-center font-display font-extrabold", text)}
      >
        {seconds}
      </span>
      {warningLabel && (
        <span aria-live="polite" className="sr-only">
          {isWarning ? warningLabel : ""}
        </span>
      )}
    </div>
  );
};
