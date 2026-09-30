import { useCopy } from "../../.ladle/pseudo";
import { BothThemes, Caption } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { RichText } from "./RichText";

export default { title: "Primitives / Rich text" } satisfies StoryDefault;

const Sample = () => {
  const t = useCopy();
  return (
    <>
      <Caption>Mixed marks</Caption>
      <p className="font-display text-title-lg font-medium">
        <RichText
          runs={[
            { text: t("Which planet has the ") },
            { text: t("most"), bold: true },
            { text: t(" known ") },
            { text: t("moons"), italic: true, underline: true },
            { text: "?" },
          ]}
        />
      </p>
      <Caption>Plain text</Caption>
      <p className="font-display text-title-lg font-medium">
        <RichText runs={[{ text: t("Who painted the ceiling of the Sistine Chapel?") }]} />
      </p>
      <Caption>Long text in a narrow column</Caption>
      <p className="max-w-[320px] font-display text-title font-medium wrap-break-word">
        <RichText
          runs={[
            { text: t("Which of these ") },
            { text: t("Scandinavian"), bold: true, italic: true },
            { text: t(" capitals lies furthest north, measured from the city centre?") },
          ]}
        />
      </p>
    </>
  );
};

export const Formatting: Story = () => <BothThemes>{() => <Sample />}</BothThemes>;
