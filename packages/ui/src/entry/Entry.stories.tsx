import { useState } from "react";
import { useCopy } from "../../.ladle/pseudo";
import { BothThemes, Frame, WITH_WORKSHOP } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { Logo } from "../icons/Logo";
import { buttonVariants } from "../primitives/Button";
import { RoomCodeInput } from "../primitives/RoomCodeInput";
import { TextField } from "../primitives/TextField";
import { EntryHero } from "./EntryHero";
import { EntryShell } from "./EntryShell";
import { HowItWorksSteps } from "./HowItWorksSteps";
import { TvMock } from "./TvMock";

export default { title: "Entry" } satisfies StoryDefault;

const JOIN_STEPS = [
  "The host opens GameMash on the TV or shares their screen",
  "Everyone joins with the room code",
  "Play a few rounds. Nothing is saved afterwards",
];

const HOST_STEPS = [
  "Open this on the TV or share your screen",
  "Players join with the code on their phones",
  "Pick your games and press Start",
];

export const Hero: Story = () => (
  <BothThemes themes={WITH_WORKSHOP}>
    {() => (
      <>
        <Frame width={350}>
          <EntryHero variant="phone" />
        </Frame>
        <Frame width={288}>
          <EntryHero variant="phone" />
        </Frame>
        <div className="relative h-[420px] w-full max-w-[560px] overflow-hidden rounded-panel border-3 border-ink-950 bg-brand-violet">
          <EntryHero variant="desktop" className="absolute -right-[18px] -bottom-[22px]" />
        </div>
      </>
    )}
  </BothThemes>
);

export const Steps: Story = () => {
  const t = useCopy();
  return (
    <BothThemes themes={WITH_WORKSHOP}>
      {() => (
        <>
          <Frame width={350}>
            <HowItWorksSteps variant="phone" steps={HOST_STEPS.map(t)} />
          </Frame>
          <div className="rounded-panel border-3 border-ink-950 bg-brand-violet p-10 text-cream">
            <HowItWorksSteps variant="violet" steps={JOIN_STEPS.map(t)} />
          </div>
          <div className="rounded-panel border-3 border-ink-950 bg-brand-lime p-10">
            <HowItWorksSteps variant="cards" steps={HOST_STEPS.map(t)} />
          </div>
        </>
      )}
    </BothThemes>
  );
};

export const Tv: Story = () => {
  const t = useCopy();
  return (
    <BothThemes themes={WITH_WORKSHOP}>
      {() => (
        <>
          <Frame width={350}>
            <TvMock title={t("Join on your phone")} code="KWPX" />
          </Frame>
          <Frame width={288}>
            <TvMock title={t("Join on your phone")} code="KWPX" />
          </Frame>
        </>
      )}
    </BothThemes>
  );
};

const PhoneCodeCard = () => {
  const t = useCopy();
  const [code, setCode] = useState("KW");
  return (
    <div className="flex flex-col gap-2.5 rounded-card border-3 border-ink-950 bg-paper-white p-[18px] shadow-brutal-md">
      <RoomCodeInput
        label={t("Room code")}
        description={t("It's shown on the big screen")}
        value={code}
        onValueChange={setCode}
        letterLabel={(position, length) => t(`Letter ${position} of ${length}`)}
      />
      <TextField label={t("Your name")} placeholder={t("e.g. Potato")} className="mt-2" />
    </div>
  );
};

export const InContext: Story = () => {
  const t = useCopy();
  return (
    <div data-theme="workshop" className="bg-graph-paper flex min-h-dvh flex-col gap-12 bg-bg p-10 text-fg">
      <div className="flex flex-wrap items-start gap-10">
        <div id="j1-hero" className="w-[350px]">
          <EntryHero variant="phone" />
        </div>
        <div id="j1-form" className="w-[350px]">
          <PhoneCodeCard />
        </div>
        <div id="j3-tv" className="w-[350px]">
          <TvMock title={t("Join on your phone")} code="KWPX" />
        </div>
        <div id="j3-steps" className="w-[350px]">
          <HowItWorksSteps variant="phone" steps={HOST_STEPS.map(t)} />
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-10">
        <section
          id="j2-panel"
          className="relative flex h-[724px] w-[772px] flex-col gap-[22px] overflow-hidden rounded-panel border-3 border-ink-950 bg-brand-violet px-[52px] py-12 text-cream shadow-brutal-xl"
        >
          <HowItWorksSteps variant="violet" steps={JOIN_STEPS.map(t)} className="mt-[190px]" />
          <EntryHero variant="desktop" className="absolute -right-[18px] -bottom-[22px]" />
        </section>
        <div id="j4-steps" className="w-[880px] max-w-full">
          <HowItWorksSteps variant="cards" steps={HOST_STEPS.map(t)} />
        </div>
      </div>
    </div>
  );
};

export const Shell: Story = () => {
  const t = useCopy();
  return (
    <EntryShell
      logo={<Logo size="md" hasOutline={false} />}
      action={
        <a href="#host" className={buttonVariants({ variant: "secondary", size: "md" })}>
          {t("Host a session")}
        </a>
      }
      mainClassName="flex-col items-center justify-center"
    >
      <div className="w-[500px] max-w-full rounded-tile border-3 border-ink-950 bg-paper-white p-8 shadow-brutal-xl">
        {t("Page content")}
      </div>
    </EntryShell>
  );
};
