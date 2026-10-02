import { GAMES } from "@gamemash/games";
import { type GamePickerOption, SparkleIcon } from "@gamemash/ui";
import { useIntl } from "react-intl";

export const useGamePickerOptions = (): GamePickerOption[] => {
  const intl = useIntl();
  return Object.values(GAMES).map((definition) => {
    const Icon = definition.icon;
    return {
      id: definition.id,
      title: intl.formatMessage({ id: definition.titleId }),
      description: intl.formatMessage({ id: definition.descriptionId }),
      accent: definition.accent,
      icon: <Icon />,
    };
  });
};

export const AI_PICKER_OPTION_ID = "ai";

export const useAiPickerOptions = (): GamePickerOption[] => {
  const intl = useIntl();
  return [
    {
      id: AI_PICKER_OPTION_ID,
      title: intl.formatMessage({ id: "ai.create" }),
      description: intl.formatMessage({ id: "ai.createDescription" }),
      accent: "brand-violet-light",
      icon: <SparkleIcon size={28} strokeWidth={2.2} className="text-ink-950" />,
    },
  ];
};
