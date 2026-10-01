import { useState } from "react";
import { useCopy } from "../../.ladle/pseudo";
import { SAMPLE_QUESTION_IMAGES } from "../../.ladle/screen-data";
import { Caption, ThemeMatrix } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { QuestionImageStrip } from "./QuestionImageStrip";

export default { title: "Workshop / Question image strip" } satisfies StoryDefault;

const StripCase = ({
  label,
  count,
  missingUrls = 0,
  pendingCount = 0,
  error,
}: {
  label: string;
  count: number;
  missingUrls?: number;
  pendingCount?: number;
  error?: string;
}) => {
  const t = useCopy();
  const [images, setImages] = useState(() =>
    SAMPLE_QUESTION_IMAGES.slice(0, count).map((image, index) =>
      index >= count - missingUrls ? { ...image, url: undefined } : image,
    ),
  );
  return (
    <div className="flex flex-col gap-2">
      <Caption>{label}</Caption>
      <QuestionImageStrip
        images={images}
        pendingCount={pendingCount}
        onRemove={(id) => setImages((current) => current.filter((image) => image.id !== id))}
        removeLabel={(position) => `${t("Remove image")} ${position}`}
        pendingLabel={t("Uploading image..")}
        error={error && t(error)}
      />
    </div>
  );
};

export const States: Story = () => (
  <ThemeMatrix>
    {() => (
      <>
        <StripCase label="3 images" count={3} />
        <StripCase label="9 images (maximum)" count={9} />
        <StripCase label="URL not loaded yet" count={3} missingUrls={1} />
        <StripCase label="2 images, 2 uploading" count={2} pendingCount={2} />
        <StripCase label="Uploading only" count={0} pendingCount={3} />
        <StripCase label="Upload error" count={2} error="A session can hold up to 150 images" />
      </>
    )}
  </ThemeMatrix>
);
