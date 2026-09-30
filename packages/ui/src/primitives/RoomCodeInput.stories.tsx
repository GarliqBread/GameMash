import { useState } from "react";
import { useCopy } from "../../.ladle/pseudo";
import { BothThemes, Frame, WITH_WORKSHOP } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { RoomCodeInput } from "./RoomCodeInput";

export default { title: "Primitives / RoomCodeInput" } satisfies StoryDefault;

type ExampleProps = {
  initial: string;
  error?: string;
  size?: "phone" | "desktop";
  width?: number;
};

const Example = ({ initial, error, size = "phone", width = 350 }: ExampleProps) => {
  const t = useCopy();
  const [code, setCode] = useState(initial);
  return (
    <Frame width={width}>
      <RoomCodeInput
        label={t("Room code")}
        description={t("It's shown on the big screen")}
        value={code}
        onValueChange={setCode}
        letterLabel={(position, length) => t(`Letter ${position} of ${length}`)}
        error={error ? t(error) : undefined}
        size={size}
      />
    </Frame>
  );
};

export const Default: Story = () => (
  <BothThemes themes={WITH_WORKSHOP}>
    {() => (
      <>
        <Example initial="KWPX" />
        <Example initial="KW" />
        <Example initial="" />
        <Example initial="KWP" error="We couldn't find that room" />
      </>
    )}
  </BothThemes>
);

export const Desktop: Story = () => (
  <BothThemes themes={WITH_WORKSHOP}>
    {() => (
      <>
        <Example initial="KW" size="desktop" width={436} />
        <Example initial="" size="desktop" width={436} />
      </>
    )}
  </BothThemes>
);

export const NarrowPhone: Story = () => (
  <BothThemes themes={["workshop"]}>{() => <Example initial="KWPX" width={280} />}</BothThemes>
);
