import type { DrawingToolbarLabels } from "@gamemash/ui";
import { useIntl } from "react-intl";

export const useToolbarLabels = (): DrawingToolbarLabels => {
  const intl = useIntl();
  const format = (id: string) => intl.formatMessage({ id });
  return {
    colorGroup: format("draw.colorGroup"),
    colors: {
      black: format("draw.color.black"),
      gray: format("draw.color.gray"),
      white: format("draw.color.white"),
      brown: format("draw.color.brown"),
      red: format("draw.color.red"),
      orange: format("draw.color.orange"),
      yellow: format("draw.color.yellow"),
      green: format("draw.color.green"),
      sky: format("draw.color.sky"),
      blue: format("draw.color.blue"),
      violet: format("draw.color.violet"),
      pink: format("draw.color.pink"),
    },
    sizeGroup: format("draw.sizeGroup"),
    sizes: { thin: format("draw.size.thin"), medium: format("draw.size.medium"), thick: format("draw.size.thick") },
    eraser: format("draw.eraser"),
    fill: format("draw.fill"),
    undo: format("draw.undo"),
    clear: format("draw.clear"),
  };
};
