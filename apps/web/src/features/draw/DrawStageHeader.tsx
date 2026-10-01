import { StageHeader } from "@gamemash/ui";
import type { ReactNode } from "react";
import { FormattedMessage } from "react-intl";

export type DrawStageHeaderProps = {
  progress: ReactNode;
  right?: ReactNode;
  className?: string | undefined;
};

export const DrawStageHeader = ({ progress, right, className }: DrawStageHeaderProps) => (
  <StageHeader
    className={className}
    game={<FormattedMessage id="game.drawIt.title" />}
    progress={progress}
    right={right}
  />
);
