import { Accessibility, type Draggable, defaultPreset } from "@dnd-kit/dom";
import { move } from "@dnd-kit/helpers";
import {
  type DragDropEventHandlers,
  DragDropProvider,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { type ComponentProps, type ReactNode, useEffect, useMemo, useRef } from "react";
import { cn } from "../lib/cn.js";
import { type GameAccent, GameCartridge } from "./GameCartridge.js";
import { LineupConnector } from "./LineupConnector.js";

export type LineupGame = {
  id: string;
  title: string;
  accent: GameAccent;
  icon: ReactNode;
  metaChips: string[];
};

export type GameLineupLabels = {
  gameNumber: (position: number) => ReactNode;
  editing: ReactNode;
  dragHandle: (game: LineupGame) => string;
  instructions: string;
  pickedUp: (game: LineupGame, position: number) => string;
  movedTo: (game: LineupGame, position: number) => string;
  dropped: (game: LineupGame, position: number) => string;
  cancelled: (game: LineupGame) => string;
};

type SortableCartridgeProps = {
  game: LineupGame;
  index: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  labels: GameLineupLabels;
};

const SortableCartridge = ({ game, index, isSelected, onSelect, labels }: SortableCartridgeProps) => {
  const { ref, handleRef, isDragging, sortable } = useSortable({ id: game.id, index });
  return (
    <li ref={ref} className="group flex flex-col gap-4">
      <LineupConnector className="group-first:hidden" />
      <GameCartridge
        title={game.title}
        eyebrow={labels.gameNumber(sortable.index + 1)}
        accent={game.accent}
        icon={game.icon}
        metaChips={game.metaChips}
        isSelected={isSelected}
        onSelect={() => onSelect(game.id)}
        editingLabel={labels.editing}
        dragHandleLabel={labels.dragHandle(game)}
        handleRef={handleRef}
        isDragging={isDragging}
      />
    </li>
  );
};

const gameById = (games: LineupGame[], id: unknown) => games.find((game) => game.id === id);

const positionOf = (element: Draggable | null) => (isSortable(element) ? element.index + 1 : 0);

const hasMoved = (element: Draggable | null) => isSortable(element) && element.index !== element.initialIndex;

export type GameLineupProps = Omit<ComponentProps<"ol">, "children" | "onSelect"> & {
  games: LineupGame[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onReorder: (games: LineupGame[]) => void;
  labels: GameLineupLabels;
};

export const GameLineup = ({
  games,
  selectedId,
  onSelect,
  onReorder,
  labels,
  className,
  ...props
}: GameLineupProps) => {
  const latest = useRef({ games, labels });
  useEffect(() => {
    latest.current = { games, labels };
  }, [games, labels]);

  const plugins = useMemo(
    () =>
      defaultPreset.plugins.map((plugin) =>
        plugin === Accessibility
          ? Accessibility.configure({
              screenReaderInstructions: { draggable: labels.instructions },
              announcements: {
                dragstart: ({ operation }: DragStartEvent) => {
                  const game = gameById(latest.current.games, operation.source?.id);
                  return game && latest.current.labels.pickedUp(game, positionOf(operation.source));
                },
                dragover: ({ operation }: DragOverEvent) => {
                  if (!hasMoved(operation.source)) return undefined;
                  const game = gameById(latest.current.games, operation.source?.id);
                  return game && latest.current.labels.movedTo(game, positionOf(operation.source));
                },
                dragend: ({ operation, canceled }: DragEndEvent) => {
                  const game = gameById(latest.current.games, operation.source?.id);
                  if (!game) return undefined;
                  const { cancelled, dropped } = latest.current.labels;
                  return canceled ? cancelled(game) : dropped(game, positionOf(operation.source));
                },
              },
            })
          : plugin,
      ),
    [labels.instructions],
  );

  const handleDragEnd: DragDropEventHandlers["onDragEnd"] = (event) => {
    if (event.canceled) return;
    const next = move(games, event);
    if (next !== games) onReorder(next);
  };

  return (
    <DragDropProvider key={labels.instructions} plugins={plugins} onDragEnd={handleDragEnd}>
      <ol className={cn("flex flex-col gap-4", className)} {...props}>
        {games.map((game, index) => (
          <SortableCartridge
            key={game.id}
            game={game}
            index={index}
            isSelected={game.id === selectedId}
            onSelect={onSelect}
            labels={labels}
          />
        ))}
      </ol>
    </DragDropProvider>
  );
};
