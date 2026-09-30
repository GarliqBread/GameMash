import { useCopy } from "../../.ladle/pseudo";
import { BothThemes, Frame, WITH_WORKSHOP } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { Switch } from "./Switch";

export default { title: "Primitives / Switch" } satisfies StoryDefault;

export const WithLabels: Story = () => {
  const t = useCopy();
  return (
    <BothThemes themes={WITH_WORKSHOP}>
      {() => (
        <Frame width={292}>
          <div className="flex flex-col gap-4">
            <Switch label={t("Faster answers score more")} onLabel={t("On")} offLabel={t("Off")} defaultChecked />
            <Switch label="Nachzügler dürfen mitspielen" onLabel="Aan" offLabel="Uit" />
            <Switch
              label="Antwortmöglichkeiten mischen"
              onLabel="Eingeschaltet"
              offLabel="Ausgeschaltet"
              defaultChecked
            />
            <Switch label={t("Shuffle answer options")} />
            <Switch label="Antwortmöglichkeiten mischen" defaultChecked />
            <Switch label="Nachzügler dürfen mitspielen" />
            <Switch label={t("Show leaderboard after each question")} disabled />
            <Switch aria-label={t("Standalone switch")} defaultChecked />
          </div>
        </Frame>
      )}
    </BothThemes>
  );
};
