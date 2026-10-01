import type { MessageId } from "@gamemash/messages";
import type { GameAccent } from "@gamemash/ui";
import type { ReactNode } from "react";
import type { GameType } from "./setup.js";

export type GameDefinition = {
  id: GameType;
  titleId: MessageId;
  descriptionId: MessageId;
  roundCountId: MessageId;
  accent: GameAccent;
  icon: () => ReactNode;
};
