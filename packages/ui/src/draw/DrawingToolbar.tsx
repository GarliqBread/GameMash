import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import type { ComponentProps } from "react";
import { EraserIcon, TrashIcon, UndoIcon } from "../icons/icons.js";
import { cn } from "../lib/cn.js";
import { BRUSH_SIZES, type BrushSize, DRAW_COLORS, type DrawColor, type DrawTool } from "../lib/drawing.js";
import { IconButton } from "../primitives/IconButton.js";
import { SegmentedControl } from "../primitives/SegmentedControl.js";

const SWATCH_CLASSES: Record<DrawColor, string> = {
  black: "bg-draw-black not-data-[checked]:ring-fg-subtle",
  red: "bg-draw-red",
  orange: "bg-draw-orange",
  yellow: "bg-draw-yellow",
  green: "bg-draw-green",
  blue: "bg-draw-blue",
};

const BRUSH_DOTS: Record<BrushSize, string> = {
  thin: "size-1.5",
  medium: "size-3",
  thick: "size-5",
};

export type ColorSwatchPickerProps = Omit<
  ComponentProps<typeof RadioGroup>,
  "value" | "defaultValue" | "onValueChange" | "className" | "children"
> & {
  value: DrawColor | null;
  onValueChange: (color: DrawColor) => void;
  colorLabels: Record<DrawColor, string>;
  className?: string | undefined;
};

export const ColorSwatchPicker = ({
  value,
  onValueChange,
  colorLabels,
  className,
  ...props
}: ColorSwatchPickerProps) => (
  <RadioGroup<DrawColor | null>
    value={value}
    onValueChange={(next) => {
      if (next !== null) onValueChange(next);
    }}
    className={cn("grid grid-cols-6 gap-2", className)}
    {...props}
  >
    {DRAW_COLORS.map((color) => (
      <Radio.Root
        key={color}
        value={color}
        aria-label={colorLabels[color]}
        className={cn(
          "focus-ring h-12 min-w-12 cursor-pointer rounded-full not-data-[checked]:ring-2 not-data-[checked]:ring-border-strong",
          "data-[checked]:ring-[3px] data-[checked]:ring-cream data-[checked]:ring-offset-[3px] data-[checked]:ring-offset-ink-950",
          SWATCH_CLASSES[color],
        )}
      />
    ))}
  </RadioGroup>
);

export type BrushSizePickerProps = {
  value: BrushSize;
  onValueChange: (size: BrushSize) => void;
  sizeLabels: Record<BrushSize, string>;
  groupLabel: string;
  className?: string | undefined;
};

export const BrushSizePicker = ({ value, onValueChange, sizeLabels, groupLabel, className }: BrushSizePickerProps) => (
  <SegmentedControl
    aria-label={groupLabel}
    value={value}
    onValueChange={onValueChange}
    className={cn("inline-grid", className)}
    itemClassName="w-11 px-0"
    options={BRUSH_SIZES.map((size) => ({
      value: size,
      ariaLabel: sizeLabels[size],
      label: <span className={cn("rounded-full bg-current", BRUSH_DOTS[size])} />,
    }))}
  />
);

export type DrawingToolbarLabels = {
  colorGroup: string;
  colors: Record<DrawColor, string>;
  sizeGroup: string;
  sizes: Record<BrushSize, string>;
  eraser: string;
  undo: string;
  clear: string;
};

export type DrawingToolbarProps = Omit<ComponentProps<"div">, "children"> & {
  color: DrawColor;
  onColorChange: (color: DrawColor) => void;
  size: BrushSize;
  onSizeChange: (size: BrushSize) => void;
  tool: DrawTool;
  onToolChange: (tool: DrawTool) => void;
  onUndo: () => void;
  onClear: () => void;
  canUndo: boolean;
  labels: DrawingToolbarLabels;
};

export const DrawingToolbar = ({
  color,
  onColorChange,
  size,
  onSizeChange,
  tool,
  onToolChange,
  onUndo,
  onClear,
  canUndo,
  labels,
  className,
  ...props
}: DrawingToolbarProps) => {
  const isErasing = tool === "eraser";
  return (
    <div className={cn("flex flex-col gap-3.5", className)} {...props}>
      <ColorSwatchPicker
        aria-label={labels.colorGroup}
        value={isErasing ? null : color}
        onValueChange={onColorChange}
        colorLabels={labels.colors}
      />
      <div className="flex items-center gap-2">
        <BrushSizePicker
          value={size}
          onValueChange={onSizeChange}
          sizeLabels={labels.sizes}
          groupLabel={labels.sizeGroup}
        />
        <div className="flex-1" />
        <IconButton
          label={labels.eraser}
          variant="surface"
          size="md"
          aria-pressed={isErasing}
          onClick={() => onToolChange(isErasing ? "brush" : "eraser")}
          className="aria-pressed:bg-selected aria-pressed:text-on-selected"
        >
          <EraserIcon />
        </IconButton>
        <IconButton label={labels.undo} variant="surface" size="md" disabled={!canUndo} onClick={onUndo}>
          <UndoIcon />
        </IconButton>
        <IconButton label={labels.clear} variant="surface" size="md" disabled={!canUndo} onClick={onClear}>
          <TrashIcon />
        </IconButton>
      </div>
    </div>
  );
};
