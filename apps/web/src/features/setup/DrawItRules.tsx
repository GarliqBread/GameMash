import { DRAW_IT_DRAW_SECONDS, type DrawItConfig } from "@gamemash/games/config";
import { RulesPanel, SegmentedControl, SettingsField } from "@gamemash/ui";
import { FormattedMessage, useIntl } from "react-intl";

export type DrawItRulesProps = {
  config: DrawItConfig;
  onChange: (change: (config: DrawItConfig) => DrawItConfig) => void;
};

export const DrawItRules = ({ config, onChange }: DrawItRulesProps) => {
  const intl = useIntl();
  return (
    <RulesPanel title={<FormattedMessage id="setup.rulesTitle" />}>
      <SettingsField label={<FormattedMessage id="setup.drawTime" />}>
        {(labelId) => (
          <SegmentedControl
            aria-labelledby={labelId}
            value={String(config.drawSeconds)}
            className="grid-flow-row grid-cols-2"
            itemClassName="whitespace-nowrap"
            onValueChange={(value) => onChange((current) => ({ ...current, drawSeconds: Number(value) }))}
            options={DRAW_IT_DRAW_SECONDS.map((seconds) => ({
              value: String(seconds),
              label: intl.formatMessage({ id: "setup.seconds" }, { seconds }),
            }))}
          />
        )}
      </SettingsField>
    </RulesPanel>
  );
};
