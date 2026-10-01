import { TimerPill } from "@gamemash/ui";
import type { ReactNode } from "react";
import { useSecondsLabel } from "../game/useSecondsLabel";

export type PhoneTimerHeaderProps = {
  progress: ReactNode;
  seconds: number;
  isActive: boolean;
};

export const PhoneTimerHeader = ({ progress, seconds, isActive }: PhoneTimerHeaderProps) => {
  const secondsLabel = useSecondsLabel();
  return (
    <>
      {progress}
      <TimerPill seconds={seconds} label={secondsLabel(seconds)} tone={isActive ? "active" : "idle"} />
    </>
  );
};
