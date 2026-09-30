import { ANSWER_SHAPES, AnswerShape } from "@gamemash/ui";
import type { GameDefinition } from "../definition.js";

const PopQuizIcon = () => (
  <span className="grid grid-cols-2 gap-1 text-ink-950">
    {ANSWER_SHAPES.map((shape) => (
      <AnswerShape key={shape} shape={shape} size={18} />
    ))}
  </span>
);

export const popQuiz: GameDefinition = {
  id: "pop-quiz",
  titleId: "game.popQuiz.title",
  descriptionId: "game.popQuiz.description",
  roundCountId: "game.popQuiz.roundCount",
  accent: "sun",
  icon: PopQuizIcon,
};
