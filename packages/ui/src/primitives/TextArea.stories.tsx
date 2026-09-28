import { useState } from "react";
import { useCopy } from "../../.ladle/pseudo";
import { BothThemes, Frame, WITH_WORKSHOP } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { TextArea } from "./TextArea";

export default { title: "Primitives / TextArea" } satisfies StoryDefault;

const Example = ({ error }: { error?: string }) => {
  const t = useCopy();
  const [value, setValue] = useState("Which planet has the most known moons?");
  return (
    <Frame width={480}>
      <TextArea
        label={t("Question text")}
        value={value}
        onValueChange={setValue}
        error={error ? t(error) : undefined}
        controlClassName="font-display text-2xl/tight font-bold"
      />
    </Frame>
  );
};

export const Default: Story = () => (
  <BothThemes themes={WITH_WORKSHOP}>
    {() => (
      <>
        <Example />
        <Example error="Write a question first" />
      </>
    )}
  </BothThemes>
);
