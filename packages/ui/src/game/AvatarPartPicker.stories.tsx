import { useState } from "react";
import { useCopy } from "../../.ladle/pseudo";
import { Frame, ThemeMatrix } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { type AvatarPartOption, AvatarPartPicker } from "./AvatarPartPicker";

export default { title: "Game / Avatar part picker" } satisfies StoryDefault;

type Tab = "top" | "topColor" | "eyes" | "mouth" | "nose" | "head" | "beard" | "mustache";

const face = (index: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><ellipse cx='50' cy='55' rx='30' ry='36' fill='white' stroke='black' stroke-width='3'/><circle cx='${38 + (index % 4)}' cy='50' r='${3 + (index % 3)}'/><circle cx='${62 - (index % 4)}' cy='50' r='${3 + (index % 3)}'/><path d='M38 ${70 + (index % 5)} Q50 ${78 - (index % 7)} 62 ${70 + (index % 5)}' fill='none' stroke='black' stroke-width='3'/></svg>`,
  )}`;

export const Picker: Story = () => {
  const t = useCopy();
  const [tab, setTab] = useState<Tab>("top");
  const [value, setValue] = useState("3");
  const tabs: { value: Tab; label: string }[] = [
    { value: "top", label: t("Hair & hats") },
    { value: "topColor", label: t("Colour") },
    { value: "eyes", label: t("Eyes") },
    { value: "mouth", label: t("Mouth") },
    { value: "nose", label: t("Nose") },
    { value: "head", label: t("Face") },
    { value: "beard", label: t("Beard") },
    { value: "mustache", label: t("Moustache") },
  ];
  const hasNone = tab === "beard" || tab === "mustache";
  const options: AvatarPartOption[] = Array.from({ length: 12 }, (_, index) => ({
    value: String(index),
    src: face(index),
    label: hasNone && index === 0 ? t("None") : t(`Option ${index + 1}`),
    caption: hasNone && index === 0 ? t("None") : undefined,
  }));
  return (
    <ThemeMatrix>
      {() => (
        <Frame width={358}>
          <AvatarPartPicker
            tabs={tabs}
            tab={tab}
            onTabChange={setTab}
            tabsLabel={t("Parts")}
            options={options}
            value={value}
            onValueChange={setValue}
          />
        </Frame>
      )}
    </ThemeMatrix>
  );
};
