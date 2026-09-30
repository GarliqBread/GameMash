import { useEffect, useState } from "react";
import { useCopy } from "../../.ladle/pseudo";
import { BothThemes, Caption, Row, StageFrame } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { TimerPill } from "./TimerPill";
import { TimerRing } from "./TimerRing";

export default { title: "Game / Timers" } satisfies StoryDefault;

const useCountdown = (from: number) => {
  const [seconds, setSeconds] = useState(from);
  useEffect(() => {
    const id = setInterval(() => setSeconds((current) => (current <= 0 ? from : current - 1)), 1000);
    return () => clearInterval(id);
  }, [from]);
  return seconds;
};

export const Rings: Story = () => {
  const t = useCopy();
  const live = useCountdown(12);
  return (
    <StageFrame>
      <Caption>148: 14 of 20, 4 of 20 (pulses), 0</Caption>
      <div className="flex items-center gap-12">
        <TimerRing seconds={14} total={20} label={t("14 seconds left")} />
        <TimerRing seconds={4} total={20} label={t("4 seconds left")} warningLabel={t("5 seconds left")} />
        <TimerRing seconds={0} total={20} label={t("Time's up")} />
      </div>
      <Caption>112: live countdown</Caption>
      <div className="flex items-center gap-12">
        <TimerRing
          size={112}
          seconds={live}
          total={12}
          label={t(`${live} seconds left`)}
          warningLabel={t("5 seconds left")}
        />
        <TimerRing size={112} seconds={9} total={10} label={t("9 seconds left")} />
      </div>
    </StageFrame>
  );
};

export const Pills: Story = () => {
  const t = useCopy();
  return (
    <BothThemes>
      {() => (
        <Row label="active / idle">
          <TimerPill seconds={42} label={t("42 seconds left")} />
          <TimerPill seconds={9} label={t("9 seconds left")} />
          <TimerPill seconds={9} tone="idle" label={t("9 seconds left")} />
        </Row>
      )}
    </BothThemes>
  );
};
