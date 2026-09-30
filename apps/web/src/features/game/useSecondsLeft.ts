import { useEffect, useState } from "react";
import { useLobbyStore } from "../../lib/lobby";

const TICK_MS = 250;
const MS_PER_SECOND = 1000;

const secondsLeft = (endsAt: number | null, clockOffset: number) =>
  endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - (Date.now() + clockOffset)) / MS_PER_SECOND));

export const useSecondsLeft = (endsAt: number | null) => {
  const clockOffset = useLobbyStore((store) => store.clockOffset);
  const [seconds, setSeconds] = useState(() => secondsLeft(endsAt, clockOffset));

  useEffect(() => {
    setSeconds(secondsLeft(endsAt, clockOffset));
    if (endsAt === null) return;
    const timer = setInterval(() => setSeconds(secondsLeft(endsAt, clockOffset)), TICK_MS);
    return () => clearInterval(timer);
  }, [endsAt, clockOffset]);

  return seconds;
};
