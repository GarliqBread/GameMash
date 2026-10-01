import { POP_QUIZ_AUTO_NEXT_SECONDS, POP_QUIZ_TIME_LIMITS, type PopQuizConfig } from "@gamemash/games/config";
import { RuleSwitchList, RulesPanel, SegmentedControl, SettingsField } from "@gamemash/ui";
import { FormattedMessage, useIntl } from "react-intl";

export type QuizRulesProps = {
  config: PopQuizConfig;
  onChange: (change: (config: PopQuizConfig) => PopQuizConfig) => void;
};

export const QuizRules = ({ config, onChange }: QuizRulesProps) => {
  const intl = useIntl();
  const toggle =
    (key: "speedBonus" | "leaderboardAfterEachQuestion" | "autoNextQuestion" | "shuffleAnswers") =>
    (checked: boolean) =>
      onChange((current) => ({ ...current, [key]: checked }));

  return (
    <RulesPanel title={<FormattedMessage id="setup.rulesTitle" />}>
      <SettingsField label={<FormattedMessage id="setup.timePerQuestion" />}>
        {(labelId) => (
          <SegmentedControl
            aria-labelledby={labelId}
            value={String(config.timeLimitSeconds)}
            className="grid-flow-row grid-cols-3"
            itemClassName="whitespace-nowrap"
            onValueChange={(value) => onChange((current) => ({ ...current, timeLimitSeconds: Number(value) }))}
            options={POP_QUIZ_TIME_LIMITS.map((seconds) => ({
              value: String(seconds),
              label: intl.formatMessage({ id: "setup.seconds" }, { seconds }),
            }))}
          />
        )}
      </SettingsField>
      <RuleSwitchList
        onLabel={<FormattedMessage id="setup.on" />}
        offLabel={<FormattedMessage id="setup.off" />}
        rules={[
          {
            id: "speed",
            label: intl.formatMessage({ id: "setup.speedBonus" }),
            checked: config.speedBonus,
            onCheckedChange: toggle("speedBonus"),
          },
          {
            id: "leaderboard",
            label: intl.formatMessage({ id: "setup.leaderboard" }),
            checked: config.leaderboardAfterEachQuestion,
            onCheckedChange: toggle("leaderboardAfterEachQuestion"),
          },
          {
            id: "autoNext",
            label: intl.formatMessage({ id: "setup.autoNextQuestion" }, { seconds: POP_QUIZ_AUTO_NEXT_SECONDS }),
            checked: config.autoNextQuestion ?? true,
            onCheckedChange: toggle("autoNextQuestion"),
          },
          {
            id: "shuffle",
            label: intl.formatMessage({ id: "setup.shuffle" }),
            checked: config.shuffleAnswers,
            onCheckedChange: toggle("shuffleAnswers"),
          },
        ]}
      />
    </RulesPanel>
  );
};
