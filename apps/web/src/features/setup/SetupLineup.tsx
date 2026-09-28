import { gameDefinition } from "@gamemash/games";
import { type GameSetup, quizTimeRange } from "@gamemash/games/config";
import type { SecondsRange } from "@gamemash/shared";
import { GameLineup, type GameLineupLabels, type LineupGame } from "@gamemash/ui";
import { useIntl } from "react-intl";

export type SetupLineupProps = {
  games: GameSetup[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
};

export const SetupLineup = ({ games, selectedId, onSelect, onReorder }: SetupLineupProps) => {
  const intl = useIntl();
  const format = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values);
  const formatSeconds = ({ min, max }: SecondsRange) =>
    min === max ? format("setup.seconds", { seconds: min }) : format("setup.secondsRange", { min, max });

  const labels: GameLineupLabels = {
    gameNumber: (position) => format("setup.gameNumber", { position }),
    editing: format("setup.editing"),
    dragHandle: (game) => format("setup.reorder", { title: game.title }),
    instructions: format("setup.reorderInstructions"),
    pickedUp: (game, position) => format("setup.pickedUp", { title: game.title, position }),
    movedTo: (game, position) => format("setup.movedTo", { title: game.title, position }),
    dropped: (game, position) => format("setup.dropped", { title: game.title, position }),
    cancelled: (game) => format("setup.cancelled", { title: game.title }),
  };

  const lineup: LineupGame[] = games.map((game) => {
    const definition = gameDefinition(game.type);
    const Icon = definition.icon;
    return {
      id: game.id,
      title: format(definition.titleId),
      accent: definition.accent,
      icon: <Icon />,
      metaChips: [
        format(definition.roundCountId, { count: game.config.questions.length }),
        formatSeconds(quizTimeRange(game.config)),
      ],
    };
  });

  return (
    <GameLineup
      games={lineup}
      selectedId={selectedId}
      onSelect={onSelect}
      onReorder={(next) => onReorder(next.map((game) => game.id))}
      labels={labels}
    />
  );
};
