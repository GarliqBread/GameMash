import { useState } from "react";
import { useCopy } from "../../.ladle/pseudo";
import { Row, ThemeMatrix } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { CameraIcon } from "../icons/icons";
import { FileButton } from "./FileButton";

export default { title: "Primitives / File button" } satisfies StoryDefault;

export const Variants: Story = () => {
  const t = useCopy();
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  return (
    <ThemeMatrix>
      {() => (
        <>
          <Row label="Secondary, primary, disabled">
            <FileButton
              variant="secondary"
              icon={<CameraIcon size={20} />}
              onFileSelect={(file) => setFileName(file.name)}
            >
              {t("Use a photo")}
            </FileButton>
            <FileButton icon={<CameraIcon size={20} />} onFileSelect={(file) => setFileName(file.name)}>
              {t("Use a photo")}
            </FileButton>
            <FileButton variant="secondary" disabled icon={<CameraIcon size={20} />} onFileSelect={() => undefined}>
              {t("Use a photo")}
            </FileButton>
          </Row>
          {fileName && <span className="text-caption text-fg-subtle">{fileName}</span>}
        </>
      )}
    </ThemeMatrix>
  );
};
