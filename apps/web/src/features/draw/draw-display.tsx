import type { DrawItProgress } from "@gamemash/games/config";
import type { DrawingToolbarLabels } from "@gamemash/ui";
import { FormattedMessage, useIntl } from "react-intl";

export const useToolbarLabels = (): DrawingToolbarLabels => {
  const intl = useIntl();
  const format = (id: string) => intl.formatMessage({ id });
  return {
    colorGroup: format("draw.colorGroup"),
    colors: {
      black: format("draw.color.black"),
      red: format("draw.color.red"),
      orange: format("draw.color.orange"),
      yellow: format("draw.color.yellow"),
      green: format("draw.color.green"),
      blue: format("draw.color.blue"),
      violet: format("draw.color.violet"),
    },
    sizeGroup: format("draw.sizeGroup"),
    sizes: { thin: format("draw.size.thin"), medium: format("draw.size.medium"), thick: format("draw.size.thick") },
    eraser: format("draw.eraser"),
    undo: format("draw.undo"),
    clear: format("draw.clear"),
  };
};

export const PhoneDrawWord = ({ progress, captionId }: { progress: DrawItProgress; captionId: string }) => (
  <div className="flex min-w-0 flex-col">
    <span className="text-caption text-fg-subtle">
      <FormattedMessage id={captionId} values={{ current: progress.roundIndex + 1, total: progress.roundCount }} />
    </span>
    <span className="truncate font-display text-3xl/tight font-extrabold">{progress.word}</span>
  </div>
);
