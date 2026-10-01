import { useCopy } from "../../.ladle/pseudo";
import { Frame, ThemeMatrix } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { TextField } from "./TextField";

export default { title: "Primitives / TextField" } satisfies StoryDefault;

export const Sizes: Story = () => {
  const t = useCopy();
  return (
    <ThemeMatrix>
      {() => (
        <>
          <Frame width={350}>
            <TextField label={t("Your name")} placeholder={t("e.g. Priya")} autoComplete="nickname" maxLength={20} />
          </Frame>
          <Frame width={350}>
            <TextField label={t("Your name")} defaultValue="Priya" description={t("Shown on the big screen")} />
          </Frame>
          <Frame width={350}>
            <TextField label={t("Your name")} defaultValue="" error={t("Pick a name so others know it's you")} />
          </Frame>
          <Frame width={480}>
            <TextField size="host" label={t("Question text")} defaultValue="Antwortmöglichkeiten mischen" />
          </Frame>
          <Frame width={480}>
            <TextField size="host" label={t("Session name")} hideLabel defaultValue="Friday team mash" disabled />
          </Frame>
        </>
      )}
    </ThemeMatrix>
  );
};
