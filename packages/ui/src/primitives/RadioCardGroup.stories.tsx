import { useState } from "react";
import { BothThemes, Frame } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { RadioCardGroup } from "./RadioCardGroup";

export default { title: "Primitives / RadioCardGroup" } satisfies StoryDefault;

const SCORES = Array.from({ length: 10 }, (_, index) => String(index + 1));

const Scores = () => {
  const [value, setValue] = useState<string | null>("8");
  return (
    <RadioCardGroup
      aria-label="Score from 1 to 10"
      value={value}
      onValueChange={setValue}
      className="grid grid-cols-5"
      itemClassName="h-[68px] text-3xl"
      options={SCORES.map((score) => ({ value: score, label: score }))}
    />
  );
};

const Unselected = () => {
  const [value, setValue] = useState<string | null>(null);
  return (
    <RadioCardGroup
      aria-label="Pick one"
      value={value}
      onValueChange={setValue}
      itemClassName="px-5"
      options={[
        { value: "a", label: "Option A" },
        { value: "b", label: "Option B" },
        { value: "c", label: "Disabled", disabled: true },
      ]}
    />
  );
};

export const Examples: Story = () => (
  <BothThemes>
    {() => (
      <>
        <Frame width={358}>
          <Scores />
        </Frame>
        <Unselected />
      </>
    )}
  </BothThemes>
);
