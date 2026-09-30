import { useCopy } from "../../.ladle/pseudo";
import { BothThemes, WITH_WORKSHOP } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { Heading } from "./Heading";

export default { title: "Primitives / Heading" } satisfies StoryDefault;

export const Sizes: Story = () => {
  const t = useCopy();
  return (
    <BothThemes themes={WITH_WORKSHOP}>
      {() => (
        <>
          <Heading size="display">{t("Host a session")}</Heading>
          <Heading size="host">{t("Edit questions")}</Heading>
          <Heading size="phone">{t("Join the game")}</Heading>
          <Heading as="h2" size="phone-sm">
            {t("How good is it?")}
          </Heading>
          <Heading as="h2" size="panel">
            {t("Quiz rules")}
          </Heading>
          <Heading as="h2" size="host">
            Antwortmöglichkeiten bearbeiten
          </Heading>
        </>
      )}
    </BothThemes>
  );
};
