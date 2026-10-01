import { GAMES } from "@gamemash/games";
import type { GamePickerOption } from "@gamemash/ui";
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
