import { type ReactNode, useId } from "react";
import { cn } from "../lib/cn.js";
import { RadioCardGroup, type RadioCardGroupProps } from "../primitives/RadioCardGroup.js";

const MAX_RATING = 10;

type Rating = `${number}`;

const RATINGS = Array.from({ length: MAX_RATING }, (_, index): Rating => `${index + 1}`);

export type RatingScaleProps = Omit<RadioCardGroupProps<Rating>, "options" | "value" | "onValueChange"> & {
  value: number | null;
  onValueChange: (rating: number) => void;
  lowLabel?: ReactNode;
  highLabel?: ReactNode;
};

export const RatingScale = ({
  value,
  onValueChange,
  lowLabel,
  highLabel,
  className,
  itemClassName,
  ...props
}: RatingScaleProps) => {
  const scaleLabelsId = useId();
  const hasScaleLabels = Boolean(lowLabel || highLabel);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <RadioCardGroup<Rating>
        value={value === null ? null : `${value}`}
        onValueChange={(rating) => onValueChange(Number(rating))}
        className="grid grid-cols-5"
        itemClassName={cn(
          "h-[68px] text-heading data-[checked]:border-sun data-[checked]:bg-sun data-[checked]:text-ink-950",
          itemClassName,
        )}
        options={RATINGS.map((rating) => ({ value: rating, label: rating }))}
        aria-describedby={hasScaleLabels ? scaleLabelsId : undefined}
        {...props}
      />
      {hasScaleLabels && (
        <div id={scaleLabelsId} className="flex justify-between gap-4 text-caption text-fg-subtle">
          <span>{lowLabel}</span>
          <span className="text-right">{highLabel}</span>
        </div>
      )}
    </div>
  );
};
