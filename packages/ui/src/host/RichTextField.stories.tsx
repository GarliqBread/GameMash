import { useState } from "react";
import { useCopy } from "../../.ladle/pseudo";
import { Caption, ThemeMatrix } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import type { RichTextRun } from "../lib/rich-text";
import { RichTextField } from "./RichTextField";

export default { title: "Workshop / Rich text field" } satisfies StoryDefault;

const MAX_LENGTH = 90;
const MAX_RUNS = 40;

const FieldCase = ({ label, initial }: { label: string; initial: RichTextRun[] }) => {
  const t = useCopy();
  const [value, setValue] = useState(initial);
  return (
    <div className="flex max-w-[640px] flex-col gap-2">
      <Caption>{label}</Caption>
      <RichTextField
        label={t("Question 1")}
        value={value}
        onValueChange={setValue}
        maxLength={MAX_LENGTH}
        maxRuns={MAX_RUNS}
        counterLabel={(length, max) => t(`${length} / ${max}`)}
        placeholder={t("Type your question")}
        toolbarLabel={t("Text formatting")}
        markLabels={{ bold: t("Bold"), italic: t("Italic"), underline: t("Underline") }}
      />
    </div>
  );
};

const Cases = () => {
  const t = useCopy();
  return (
    <>
      <FieldCase label="Empty" initial={[]} />
      <FieldCase
        label="Formatted"
        initial={[
          { text: t("Which planet has the ") },
          { text: t("most"), bold: true },
          { text: t(" known ") },
          { text: t("moons"), italic: true, underline: true },
          { text: "?" },
        ]}
      />
      <FieldCase
        label="Near the limit"
        initial={[{ text: t("Which of these Scandinavian capitals lies furthest north, measured from the centre?") }]}
      />
    </>
  );
};

export const States: Story = () => <ThemeMatrix>{() => <Cases />}</ThemeMatrix>;
