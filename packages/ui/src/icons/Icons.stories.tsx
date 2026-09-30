import { BothThemes, Row, WITH_WORKSHOP } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { ANSWER_SHAPES, ANSWERS } from "../lib/answers";
import { AnswerShape } from "./AnswerShape";
import * as icons from "./icons";
import { Logo } from "./Logo";

export default { title: "Foundations / Icons & logo" } satisfies StoryDefault;

export const Logos: Story = () => (
  <BothThemes themes={WITH_WORKSHOP}>
    {() => (
      <>
        <Logo size="sm" />
        <Logo size="md" />
        <Logo size="lg" />
        <Logo size="md" hasOutline={false} />
        <Logo size="lg" showWordmark={false} label="GameMash" />
      </>
    )}
  </BothThemes>
);

export const AnswerShapes: Story = () => (
  <BothThemes themes={WITH_WORKSHOP}>
    {() => (
      <>
        <Row label="currentColor">
          {ANSWER_SHAPES.map((shape) => (
            <AnswerShape key={shape} shape={shape} size={48} />
          ))}
        </Row>
        <Row label="On answer colours (shape + colour + lightness)">
          {ANSWER_SHAPES.map((shape) => (
            <span
              key={shape}
              className={`flex size-24 items-center justify-center rounded-tile ${ANSWERS[shape].bg} ${ANSWERS[shape].fg}`}
            >
              <AnswerShape shape={shape} size={56} label={ANSWERS[shape].defaultLabel} />
            </span>
          ))}
        </Row>
      </>
    )}
  </BothThemes>
);

export const GenericIcons: Story = () => (
  <BothThemes themes={WITH_WORKSHOP}>
    {() => (
      <Row>
        {Object.entries(icons).map(([name, IconComponent]) => (
          <span key={name} className="flex w-28 flex-col items-center gap-2 text-caption text-fg-subtle">
            <IconComponent className="text-fg" />
            {name.replace("Icon", "")}
          </span>
        ))}
      </Row>
    )}
  </BothThemes>
);
