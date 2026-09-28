import { BothThemes, Row, WITH_WORKSHOP } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { CopyIcon, EraserIcon, PlusIcon, TrashIcon, UndoIcon } from "../icons/icons";
import { IconButton } from "./IconButton";

export default { title: "Primitives / IconButton" } satisfies StoryDefault;

export const Variants: Story = () => (
  <BothThemes themes={WITH_WORKSHOP}>
    {() => (
      <>
        <Row label="ghost / sm (host)">
          <IconButton label="Duplicate question">
            <CopyIcon size={20} />
          </IconButton>
          <IconButton label="Delete question">
            <TrashIcon size={20} />
          </IconButton>
        </Row>
        <Row label="surface / md (phone tools)">
          <IconButton label="Eraser" variant="surface" size="md">
            <EraserIcon />
          </IconButton>
          <IconButton label="Undo" variant="surface" size="md">
            <UndoIcon />
          </IconButton>
          <IconButton label="Clear drawing" variant="surface" size="md">
            <TrashIcon />
          </IconButton>
        </Row>
        <Row label="dashed / secondary / disabled">
          <IconButton label="Add question" variant="dashed">
            <PlusIcon size={18} />
          </IconButton>
          <IconButton label="Add question" variant="secondary">
            <PlusIcon size={18} />
          </IconButton>
          <IconButton label="Undo" variant="surface" size="md" disabled>
            <UndoIcon />
          </IconButton>
        </Row>
      </>
    )}
  </BothThemes>
);
