import { useCopy } from "../../.ladle/pseudo";
import { Caption, StageFrame } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { CountStat } from "./CountStat";
import { ProgressDots } from "./ProgressDots";
import { StageHeader } from "./StageHeader";
import { TimerRing } from "./TimerRing";

export default { title: "Game / Stage header" } satisfies StoryDefault;

export const Examples: Story = () => {
  const t = useCopy();
  return (
    <StageFrame>
      <Caption>Quiz question</Caption>
      <StageHeader
        game={t("Pop quiz")}
        progress={t("Question 4 of 10")}
        right={
          <>
            <CountStat value={7} total={9} caption={t("answered")} />
            <TimerRing seconds={14} total={20} label={t("14 seconds left")} />
          </>
        }
      />
      <Caption>Draw vote</Caption>
      <StageHeader
        game={t("Draw it")}
        progress={t("Voting · “Lighthouse”")}
        right={
          <>
            <span className="text-stage-body font-bold">{t("Drawing 3 of 9")}</span>
            <ProgressDots total={9} current={3} />
          </>
        }
      />
      <Caption>Long German progress text truncates</Caption>
      <StageHeader
        game="Zeichnen"
        progress="Abstimmung läuft · „Leuchtturmwärterhäuschen am Wattenmeer“"
        right={<CountStat value={5} total={8} caption="haben bewertet (der Künstler setzt aus)" size="md" />}
      />
    </StageFrame>
  );
};
