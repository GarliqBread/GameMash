import { useState } from "react";
import { useCopy } from "../../.ladle/pseudo";
import { BothThemes, Frame } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { RoomCodeInput } from "./RoomCodeInput";

export default { title: "Primitives / RoomCodeInput" } satisfies StoryDefault;

const Example = ({ initial, error }: { initial: string; error?: string }) => {
  const t = useCopy();
  const [code, setCode] = useState(initial);
  return (
    <Frame width={350}>
      <RoomCodeInput
        label={t("Room code")}
        description={t("It's shown on the big screen")}
        value={code}
        onValueChange={setCode}
        error={error ? t(error) : undefined}
      />
    </Frame>
  );
};

export const Default: Story = () => (
  <BothThemes>
    {() => (
      <>
        <Example initial="KWPX" />
        <Example initial="" />
        <Example initial="KWP" error="We couldn't find that room" />
      </>
    )}
  </BothThemes>
);
