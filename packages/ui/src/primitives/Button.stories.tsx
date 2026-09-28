import { useCopy } from "../../.ladle/pseudo";
import { BothThemes, Row, WITH_WORKSHOP } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { MonitorIcon, PlayIcon, PlusIcon } from "../icons/icons";
import { Button } from "./Button";

export default { title: "Primitives / Button" } satisfies StoryDefault;

export const Variants: Story = () => {
  const t = useCopy();
  return (
    <BothThemes themes={WITH_WORKSHOP}>
      {() => (
        <>
          <Row label="Variants (md)">
            <Button>{t("Join")}</Button>
            <Button variant="secondary" icon={<MonitorIcon size={20} />}>
              {t("Preview on big screen")}
            </Button>
            <Button variant="ghost">{t("Cancel")}</Button>
            <Button variant="dashed" icon={<PlusIcon size={20} />}>
              {t("Add a game")}
            </Button>
          </Row>
          <Row label="Sizes">
            <Button size="sm">{t("Add an image (optional)")}</Button>
            <Button size="md" iconEnd={<PlayIcon size={18} className="text-sun" />}>
              {t("Start session")}
            </Button>
            <Button size="lg" className="w-full">
              {t("I'm done")}
            </Button>
          </Row>
          <Row label="Disabled">
            <Button disabled>{t("Join")}</Button>
            <Button variant="secondary" disabled>
              {t("Preview on big screen")}
            </Button>
          </Row>
          <Row label="German">
            <Button variant="dashed" icon={<PlusIcon size={20} />}>
              Weiteres Spiel hinzufügen
            </Button>
            <Button size="lg" className="w-full">
              Ich bin fertig mit dem Zeichnen
            </Button>
          </Row>
        </>
      )}
    </BothThemes>
  );
};

export const StageSize: Story = () => {
  const t = useCopy();
  return (
    <div data-theme="stage" className="flex flex-wrap items-center gap-8 bg-bg p-12">
      <Button size="stage">{t("Start game")}</Button>
      <Button size="stage" variant="secondary">
        {t("Next question")}
      </Button>
    </div>
  );
};
