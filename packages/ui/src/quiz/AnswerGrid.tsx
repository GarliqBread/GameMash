import type { ComponentProps } from "react";
import type { AnswerOption, AnswerShapeName } from "../lib/answers.js";
import { cn } from "../lib/cn.js";
import { AnswerTile, type AnswerTileState } from "./AnswerTile.js";

const COLUMNS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-2",
};

const tileState = (shape: AnswerShapeName, correct: AnswerShapeName | undefined): AnswerTileState => {
  if (!correct) return "idle";
  return shape === correct ? "correct" : "dimmed";
};

type Reveal = { correct?: undefined; correctLabel?: undefined } | { correct: AnswerShapeName; correctLabel: string };

export type AnswerGridProps = Omit<ComponentProps<"ul">, "children"> &
  Reveal & {
    options: AnswerOption[];
    density?: "regular" | "compact" | undefined;
  };

export const AnswerGrid = ({
  options,
  correct,
  correctLabel,
  density = "regular",
  className,
  ...props
}: AnswerGridProps) => (
  <ul
    className={cn(
      "grid",
      density === "compact" ? "gap-4" : "gap-6",
      COLUMNS[options.length] ?? "grid-cols-2",
      className,
    )}
    {...props}
  >
    {options.map((option) => {
      const state = tileState(option.shape, correct);
      return (
        <li key={option.shape} className="flex min-w-0">
          <AnswerTile
            shape={option.shape}
            label={option.label}
            shapeLabel={option.shapeLabel}
            state={state}
            stateLabel={state === "correct" ? correctLabel : undefined}
            layout={options.length === 3 ? "stack" : "row"}
            density={density}
            className="flex-1"
          />
        </li>
      );
    })}
  </ul>
);
