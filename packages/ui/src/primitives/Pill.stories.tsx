import { useCopy } from "../../.ladle/pseudo";
import { BothThemes, Row } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { Pill } from "./Pill";

export default { title: "Primitives / Pill" } satisfies StoryDefault;

export const Variants: Story = () => {
  const t = useCopy();
  return (
    <BothThemes>
      {() => (
        <>
          <Row label="stage">
            <Pill>{t("Pop quiz")}</Pill>
            <Pill variant="accent">{t("9 joined")}</Pill>
            <Pill variant="surface">{t("Draw it")}</Pill>
          </Row>
          <Row label="phone">
            <Pill size="phone">{t("Pop quiz")}</Pill>
            <Pill size="phone" variant="accent">
              +840
            </Pill>
            <Pill size="phone" variant="surface">
              Nachzügler dürfen mitspielen
            </Pill>
          </Row>
        </>
      )}
    </BothThemes>
  );
};
