import { useCopy } from "../../.ladle/pseudo";
import { Frame, ThemeMatrix } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { TextArea } from "./TextArea";

export default { title: "Primitives / TextArea" } satisfies StoryDefault;

const REPLY = '```json\n{"words": ["Lighthouse", "Coffee machine on fire", "Riding a bike"]}\n```';

export const States: Story = () => {
  const t = useCopy();
  return (
    <ThemeMatrix>
      {() => (
        <>
          <Frame width={480}>
            <TextArea label={t("Paste the chatbot's reply")} placeholder={t("Paste the reply here")} />
          </Frame>
          <Frame width={480}>
            <TextArea
              label={t("Paste the chatbot's reply")}
              defaultValue={REPLY}
              description={t("Only the code block is read")}
            />
          </Frame>
          <Frame width={480}>
            <TextArea
              label={t("Paste the chatbot's reply")}
              defaultValue="Sorry!"
              error={t("That isn't the JSON we asked for")}
            />
          </Frame>
          <Frame width={480}>
            <TextArea label={t("Paste the chatbot's reply")} rows={3} disabled />
          </Frame>
        </>
      )}
    </ThemeMatrix>
  );
};
