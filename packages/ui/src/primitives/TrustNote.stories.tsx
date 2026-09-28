import { useCopy } from "../../.ladle/pseudo";
import { BothThemes, Frame, WITH_WORKSHOP } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { TrustNote } from "./TrustNote";

export default { title: "Primitives / TrustNote" } satisfies StoryDefault;

export const Variants: Story = () => {
  const t = useCopy();
  return (
    <BothThemes themes={WITH_WORKSHOP}>
      {() => (
        <>
          <Frame width={350}>
            <TrustNote>{t("No account needed. Your name and photo are deleted when the session ends.")}</TrustNote>
          </Frame>
          <Frame width={350}>
            <TrustNote icon="eye-off">
              {t("You gave it an 8. You can change it until time runs out. Nobody sees who voted what.")}
            </TrustNote>
          </Frame>
          <TrustNote size="stage" className="self-start">
            {t("Nothing is saved after the game")}
          </TrustNote>
        </>
      )}
    </BothThemes>
  );
};
