import { isGameId } from "@gamemash/games";
import { MAX_GAMES, SESSION_NAME_MAX_LENGTH, type SessionSetup } from "@gamemash/games/config";
import {
  Button,
  GamePicker,
  InsertGameSlot,
  Logo,
  PlayIcon,
  SectionTab,
  SessionNameSticker,
  TrustNote,
  WorkshopShell,
} from "@gamemash/ui";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { GameSettings, newGame } from "../games/workshop-games";
import { useHostCredentials } from "../host/host-credentials";
import { SetupLineup } from "./SetupLineup";
import { SetupTransferButtons } from "./SetupTransfer";
import { addGame, removeGame, reorderGames } from "./setup-changes";
import { firstUnready, setupProblemId } from "./setup-readiness";
import { useGamePickerOptions } from "./useGamePickerOptions";
import { useImageUploads } from "./useImageUploads";
import { useSetupEditor } from "./useSetupEditor";
import { useSetupTransfer } from "./useSetupTransfer";
import { useWorkshopSelection } from "./useWorkshopSelection";
import { WorkshopEditor } from "./WorkshopEditor";

export type SetupWorkshopProps = {
  initialSetup: SessionSetup;
  imagesEnabled: boolean;
};

export const SetupWorkshop = ({ initialSetup, imagesEnabled }: SetupWorkshopProps) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { sessionId } = useHostCredentials();
  const { setup, status, saveError, update, flush, replace } = useSetupEditor(initialSetup);
  const uploads = useImageUploads();
  const pickerOptions = useGamePickerOptions();
  const { game, selectedItemId, selectGame, selectItem } = useWorkshopSelection(setup);
  const [hasTriedToOpen, setHasTriedToOpen] = useState(false);
  const insertSlotRef = useRef<HTMLButtonElement>(null);
  const transfer = useSetupTransfer({
    setup,
    flush,
    replace,
    onImported: ({ setup: merged, addedGames }) => {
      if (addedGames > 0) selectGame(merged.games.at(-addedGames)?.id);
    },
  });

  const handleInsert = (type: string) => {
    if (!isGameId(type)) return;
    const added = newGame(type);
    update((current) => addGame(current, added));
    selectGame(added.id);
  };

  const handleRemove = () => {
    if (!game) return;
    const index = setup.games.indexOf(game);
    const neighbour = setup.games[index + 1] ?? setup.games[index - 1];
    update((current) => removeGame(current, game.id));
    selectGame(neighbour?.id);
  };

  const handleOpenLobby = async () => {
    setHasTriedToOpen(true);
    const unready = firstUnready(setup);
    if (unready) {
      selectGame(unready.game.id);
      if (unready.itemId) selectItem(unready.game.id, unready.itemId);
      return;
    }
    if (setup.games.length === 0) return;
    if (await flush()) void navigate({ to: "/host/$sessionId", params: { sessionId } });
  };

  return (
    <WorkshopShell
      lineupLabel={intl.formatMessage({ id: "setup.lineupTitle" })}
      settingsLabel={intl.formatMessage({ id: "setup.rulesTitle" })}
      header={
        <>
          <Logo size="md" />
          <SessionNameSticker
            label={<FormattedMessage id="setup.sessionLabel" />}
            value={setup.name}
            onValueChange={(name: string) => update((current) => ({ ...current, name }))}
            maxLength={SESSION_NAME_MAX_LENGTH}
            placeholder={intl.formatMessage({ id: "setup.sessionPlaceholder" })}
          />
          <div className="flex-1" />
          <SetupTransferButtons transfer={transfer} canExport={setup.games.length > 0} />
          <Button
            size="lg"
            icon={<PlayIcon size={22} />}
            className="workshop:shadow-brutal-lg"
            onClick={handleOpenLobby}
          >
            <FormattedMessage id="setup.openLobby" />
          </Button>
        </>
      }
      lineup={
        <>
          <SectionTab>
            <FormattedMessage id="setup.lineupTitle" />
          </SectionTab>
          <SetupLineup
            games={setup.games}
            selectedId={game?.id}
            onSelect={selectGame}
            onReorder={(ids) => update((current) => reorderGames(current, ids))}
          />
          <GamePicker
            options={pickerOptions}
            onPick={handleInsert}
            disabled={setup.games.length >= MAX_GAMES}
            trigger={
              <InsertGameSlot ref={insertSlotRef} className="mt-3">
                <FormattedMessage id="setup.insertGame" />
              </InsertGameSlot>
            }
          />
          <div className="flex-1" />
          <TrustNote>
            <FormattedMessage id="setup.trust" />
          </TrustNote>
        </>
      }
      editor={
        <WorkshopEditor
          game={game}
          update={update}
          selectedItemId={selectedItemId}
          onSelectItem={selectItem}
          saveStatus={status}
          saveError={saveError}
          onRetrySave={() => void flush()}
          problemId={hasTriedToOpen ? setupProblemId(setup) : null}
          transfer={transfer}
          uploads={uploads}
          imagesEnabled={imagesEnabled}
          pickerOptions={pickerOptions}
          onInsert={handleInsert}
          onRemove={handleRemove}
          removeFocusRef={insertSlotRef}
        />
      }
      settings={game ? <GameSettings game={game} update={update} /> : null}
    />
  );
};
