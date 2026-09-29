import { PencilIcon } from "@gamemash/ui";
import type { GameDefinition } from "../definition.js";

const DrawItIcon = () => <PencilIcon size={32} strokeWidth={2.2} className="text-ink-950" />;

export const drawIt: GameDefinition = {
  id: "draw-it",
  titleId: "game.drawIt.title",
  descriptionId: "game.drawIt.description",
  roundCountId: "game.drawIt.roundCount",
  accent: "brand-coral",
  icon: DrawItIcon,
};
