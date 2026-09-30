import { useCopy } from "../../.ladle/pseudo";
import { HOUSE, SAMPLE_DRAWINGS, SUN } from "../../.ladle/sample-drawings";
import { Caption, PLAYER_NAMES, StageFrame } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { TimerPill } from "../game/TimerPill";
import { PhoneShell } from "../layout/PhoneShell";
import { Button } from "../primitives/Button";
import { DrawingCanvas } from "./DrawingCanvas";
import { DrawingFrame } from "./DrawingFrame";
import { DrawingResultCard, DrawingResultChip } from "./DrawingResult";
import { DrawingToolbar, type DrawingToolbarLabels } from "./DrawingToolbar";
import { useDrawing } from "./useDrawing";

export default { title: "Draw it" } satisfies StoryDefault;

const useToolbarLabels = (): DrawingToolbarLabels => {
  const t = useCopy();
  return {
    colorGroup: t("Colour"),
    colors: {
      black: t("Black"),
      gray: t("Gray"),
      white: t("White"),
      brown: t("Brown"),
      red: t("Red"),
      orange: t("Orange"),
      yellow: t("Yellow"),
      green: t("Green"),
      sky: t("Light blue"),
      blue: t("Blue"),
      violet: t("Violet"),
      pink: t("Pink"),
    },
    sizeGroup: t("Brush size"),
    sizes: {
      thin: t("Thin brush"),
      medium: t("Medium brush"),
      thick: t("Thick brush"),
    },
    eraser: t("Eraser"),
    fill: t("Fill"),
    undo: t("Undo"),
    clear: t("Clear drawing"),
  };
};

const PhoneFrame = ({ children }: { children: React.ReactNode }) => (
  <div className="h-[844px] w-[390px] shrink-0 overflow-hidden rounded-card border border-border-strong">
    {children}
  </div>
);

export const PhoneDraw: Story = () => {
  const t = useCopy();
  const labels = useToolbarLabels();
  const controller = useDrawing();
  return (
    <div
      data-theme="stage"
      className="flex flex-wrap items-start gap-10 bg-bg p-8"
    >
      <PhoneFrame>
        <PhoneShell
          theme="stage"
          contentClassName="min-h-[844px]"
          header={
            <>
              <div className="flex min-w-0 flex-col">
                <span className="text-caption text-fg-subtle">{t("Draw")}</span>
                <span className="truncate font-display text-3xl/tight font-extrabold">
                  {t("Lighthouse")}
                </span>
              </div>
              <TimerPill seconds={42} label={t("42 seconds left")} />
            </>
          }
          bottomAction={<Button size="lg">{t("I'm done")}</Button>}
        >
          <DrawingCanvas controller={controller} label={t("Drawing area")} />
          <DrawingToolbar
            color={controller.color}
            onColorChange={controller.setColor}
            size={controller.size}
            onSizeChange={controller.setSize}
            tool={controller.tool}
            onToolChange={controller.setTool}
            onUndo={controller.undo}
            onClear={controller.clear}
            canUndo={!controller.isEmpty}
            labels={labels}
          />
        </PhoneShell>
      </PhoneFrame>
      <div className="flex flex-col gap-4">
        <Caption>Vector round trip into DrawingFrame</Caption>
        <DrawingFrame
          drawing={controller.drawing}
          label="Drawing preview"
          size={420}
        />
        <div className="flex gap-4">
          <DrawingFrame
            drawing={controller.drawing}
            label="Drawing preview"
            size={128}
          />
          <DrawingFrame
            drawing={controller.drawing}
            label="Drawing preview"
            size={64}
          />
        </div>
        <span
          data-testid="stroke-count"
          className="text-caption text-fg-subtle"
        >
          {controller.drawing.strokes.length} strokes
        </span>
      </div>
    </div>
  );
};

const RESULTS = PLAYER_NAMES.map((name, index) => ({
  name,
  average: 8.4 - index * 0.6,
  drawing: SAMPLE_DRAWINGS[index % SAMPLE_DRAWINGS.length] ?? SUN,
}));

export const Results: Story = () => {
  const t = useCopy();
  const format = new Intl.NumberFormat("en", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return (
    <StageFrame>
      <ol className="grid grid-cols-3 gap-8">
        {RESULTS.slice(0, 3).map((result, index) => (
          <DrawingResultCard
            key={result.name}
            rank={(index + 1) as 1 | 2 | 3}
            name={result.name}
            drawing={result.drawing}
            drawingLabel={t(`Drawing by ${result.name}`)}
            average={format.format(result.average)}
            outOf={t("/ 10")}
            points={`+${Math.round(result.average * 100)}`}
          />
        ))}
      </ol>
      <ol className="grid grid-cols-6 gap-5">
        {RESULTS.slice(3).map((result, index) => (
          <DrawingResultChip
            key={result.name}
            rank={`#${index + 4}`}
            name={result.name}
            drawing={result.drawing}
            drawingLabel={t(`Drawing by ${result.name}`)}
            average={format.format(result.average)}
          />
        ))}
      </ol>
      <Caption>Long names</Caption>
      <ol className="grid grid-cols-3 gap-8">
        <DrawingResultCard
          rank={1}
          name="Maximilian Oberhuber-Schwarzenberg"
          drawing={SUN}
          drawingLabel="Zeichnung von Maximilian"
          average="9,8"
          outOf="/ 10"
          points="+980"
        />
        <DrawingResultChip
          rank="#4"
          name="Anne-Sophie van der Berg-Hoogendoorn"
          drawing={HOUSE}
          drawingLabel="Tekening van Anne-Sophie"
          average="7,1"
        />
      </ol>
    </StageFrame>
  );
};
