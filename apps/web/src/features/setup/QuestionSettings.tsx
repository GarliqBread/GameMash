import {
  POP_QUIZ_POINT_LEVELS,
  POP_QUIZ_TIME_LIMITS,
  type PopQuizConfig,
  type QuizPointLevel,
  type QuizQuestion,
} from "@gamemash/games/config";
import { SegmentedControl, SettingsField } from "@gamemash/ui";
import { FormattedMessage, useIntl } from "react-intl";

const DEFAULT_TIME = "default";

export type QuestionSettingsProps = {
  config: PopQuizConfig;
  question: QuizQuestion;
  onChange: (update: (current: QuizQuestion) => QuizQuestion) => void;
};

export const QuestionSettings = ({ config, question, onChange }: QuestionSettingsProps) => {
  const intl = useIntl();
  const timeValue = question.timeLimitSeconds === null ? DEFAULT_TIME : String(question.timeLimitSeconds);

  return (
    <div className="flex flex-wrap gap-x-8 gap-y-5">
      <SettingsField label={<FormattedMessage id="setup.questionTime" />}>
        {(labelId) => (
          <SegmentedControl
            aria-labelledby={labelId}
            value={timeValue}
            className="auto-cols-auto"
            itemClassName="whitespace-nowrap"
            onValueChange={(value) =>
              onChange((current) => ({
                ...current,
                timeLimitSeconds: value === DEFAULT_TIME ? null : Number(value),
              }))
            }
            options={[
              {
                value: DEFAULT_TIME,
                label: intl.formatMessage({ id: "setup.timeDefault" }, { seconds: config.timeLimitSeconds }),
              },
              ...POP_QUIZ_TIME_LIMITS.map((seconds) => ({
                value: String(seconds),
                label: intl.formatMessage({ id: "setup.seconds" }, { seconds }),
              })),
            ]}
          />
        )}
      </SettingsField>
      <SettingsField label={<FormattedMessage id="setup.questionPoints" />}>
        {(labelId) => (
          <SegmentedControl<QuizPointLevel>
            aria-labelledby={labelId}
            value={question.points}
            onValueChange={(points) => onChange((current) => ({ ...current, points }))}
            options={POP_QUIZ_POINT_LEVELS.map((level) => ({
              value: level,
              label: intl.formatMessage({ id: "setup.pointLevel" }, { level }),
            }))}
          />
        )}
      </SettingsField>
    </div>
  );
};
