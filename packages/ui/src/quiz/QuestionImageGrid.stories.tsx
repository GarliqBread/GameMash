import { SAMPLE_QUESTION_IMAGES } from "../../.ladle/screen-data";
import { Caption, ThemeMatrix } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { QuestionImageGrid } from "./QuestionImageGrid";

export default { title: "Quiz / Question images" } satisfies StoryDefault;

const COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const Layouts: Story = () => (
  <ThemeMatrix>
    {() =>
      COUNTS.map((count) => (
        <div key={count} className="flex flex-col gap-2">
          <Caption>{count === 1 ? "1 image" : `${count} images`}</Caption>
          <div className="h-[360px]">
            <QuestionImageGrid images={SAMPLE_QUESTION_IMAGES.slice(0, count)} />
          </div>
        </div>
      ))
    }
  </ThemeMatrix>
);
