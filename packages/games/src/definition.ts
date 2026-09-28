import type { MessageId } from "@gamemash/messages";
import type { GameAccent } from "@gamemash/ui";
import type { ReactNode } from "react";

export type GameId = "pop-quiz" | "draw-it";

export type GameDefinition = {
  id: GameId;
  titleId: MessageId;
  roundCountId: MessageId;
  accent: GameAccent;
  icon: () => ReactNode;
};
