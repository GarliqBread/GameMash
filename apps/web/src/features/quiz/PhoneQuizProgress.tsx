import type { QuizProgress } from "@gamemash/games/config";
import { FormattedMessage } from "react-intl";

export const PhoneQuizProgress = ({ progress }: { progress: QuizProgress }) => (
  <span className="font-bold text-fg-muted">
    <FormattedMessage
      id="play.progress"
      values={{ current: progress.questionIndex + 1, total: progress.questionCount }}
    />
  </span>
);
