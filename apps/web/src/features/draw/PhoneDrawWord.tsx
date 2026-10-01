import type { DrawItProgress } from "@gamemash/games/config";
import { FormattedMessage } from "react-intl";

export const PhoneDrawWord = ({ progress, captionId }: { progress: DrawItProgress; captionId: string }) => (
  <div className="flex min-w-0 flex-col">
    <span className="text-caption text-fg-subtle">
      <FormattedMessage id={captionId} values={{ current: progress.roundIndex + 1, total: progress.roundCount }} />
    </span>
    <span className="truncate font-display text-3xl/tight font-extrabold">{progress.word}</span>
  </div>
);
