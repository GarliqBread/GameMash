import { useState } from "react";
import { useCopy } from "../../.ladle/pseudo";
import { Frame, ThemeMatrix } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { SegmentedControl } from "./SegmentedControl";

export default { title: "Primitives / SegmentedControl" } satisfies StoryDefault;

const TimeControl = () => {
  const t = useCopy();
  const [value, setValue] = useState("20");
  return (
    <SegmentedControl
      aria-label={t("Time per question")}
      value={value}
      onValueChange={setValue}
      options={["10", "20", "30", "60"].map((seconds) => ({ value: seconds, label: t(`${seconds} s`) }))}
    />
  );
};

const PointsControl = () => {
  const [value, setValue] = useState("1000");
  return (
    <SegmentedControl
      aria-label="Points for a right answer"
      value={value}
      onValueChange={setValue}
      options={["500", "1000", "2000"].map((points) => ({ value: points, label: points, disabled: points === "500" }))}
    />
  );
};

const BrushControl = () => {
  const [value, setValue] = useState("medium");
  const sizes = [
    { value: "thin", dot: "size-1.5", label: "Thin brush" },
    { value: "medium", dot: "size-3", label: "Medium brush" },
    { value: "thick", dot: "size-5", label: "Thick brush" },
  ];
  return (
    <SegmentedControl
      aria-label="Brush size"
      value={value}
      onValueChange={setValue}
      className="self-start"
      itemClassName="w-11 px-0"
      options={sizes.map((size) => ({
        value: size.value,
        ariaLabel: size.label,
        label: <span className={`${size.dot} rounded-full bg-current`} />,
      }))}
    />
  );
};

export const Examples: Story = () => (
  <ThemeMatrix>
    {() => (
      <>
        <Frame width={292}>
          <TimeControl />
        </Frame>
        <Frame width={292}>
          <PointsControl />
        </Frame>
        <BrushControl />
      </>
    )}
  </ThemeMatrix>
);
