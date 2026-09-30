import { useCopy } from "../../.ladle/pseudo";
import { Caption, StageFrame } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { WordCard } from "./WordCard";

export default { title: "Game / WordCard" } satisfies StoryDefault;

export const Words: Story = () => {
  const t = useCopy();
  return (
    <StageFrame>
      <div className="flex flex-col items-center gap-24 py-12">
        <WordCard as="h1">{t("Lighthouse")}</WordCard>
        <Caption>Long Dutch word wraps instead of overflowing</Caption>
        <WordCard lang="nl">Vuurtorenwachtershuisje</WordCard>
        <Caption>Two words</Caption>
        <WordCard>Rubber duck</WordCard>
      </div>
    </StageFrame>
  );
};
