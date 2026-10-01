import { gameDefinition } from "@gamemash/games";
import { type GameSetup, MAX_GAMES, type SessionSetup } from "@gamemash/games/config";
import type { ApiError } from "@gamemash/shared";
import {
  AutosaveIndicator,
  type AutosaveStatus,
  Button,
  ConfirmDialog,
  GamePicker,
  type GamePickerOption,
  Heading,
  SectionTab,
  ToolButton,
  TrashIcon,
} from "@gamemash/ui";
import { type RefObject, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useErrorMessage } from "../../lib/errors";
import { editTitleIdOf, GameEditor } from "../games/workshop-games";
import { SetupTransferStatus } from "./SetupTransfer";
import type { ImageUploads } from "./useImageUploads";
import type { SetupTransfer } from "./useSetupTransfer";

export type WorkshopEditorProps = {
  game: GameSetup | undefined;
  update: (change: (current: SessionSetup) => SessionSetup) => void;
  selectedItemId: string | undefined;
  onSelectItem: (gameId: string, itemId: string) => void;
  saveStatus: AutosaveStatus;
  saveError: ApiError | null;
  onRetrySave: () => void;
  problemId: string | null;
  transfer: SetupTransfer;
  uploads: ImageUploads;
  imagesEnabled: boolean;
  pickerOptions: GamePickerOption[];
  onInsert: (type: string) => void;
  onRemove: () => void;
  removeFocusRef: RefObject<HTMLButtonElement | null>;
};

export const WorkshopEditor = ({
  game,
  update,
  selectedItemId,
  onSelectItem,
  saveStatus,
  saveError,
  onRetrySave,
  problemId,
  transfer,
  uploads,
  imagesEnabled,
  pickerOptions,
  onInsert,
  onRemove,
  removeFocusRef,
}: WorkshopEditorProps) => {
  const formatError = useErrorMessage();
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          {game && (
            <SectionTab as="span" variant="accent">
              <FormattedMessage id={gameDefinition(game.type).titleId} />
            </SectionTab>
          )}
          <Heading size="host">
            <FormattedMessage id={game ? editTitleIdOf(game) : "setup.emptyTitle"} />
          </Heading>
        </div>
        <div className="flex items-center gap-4">
          <AutosaveIndicator
            status={saveStatus}
            onRetry={onRetrySave}
            labels={{
              saving: <FormattedMessage id="setup.saving" />,
              saved: <FormattedMessage id="setup.saved" />,
              error: <FormattedMessage id="setup.saveFailed" />,
            }}
          />
          {game && (
            <ToolButton icon={<TrashIcon size={18} strokeWidth={2.2} />} onClick={() => setIsConfirmingRemove(true)}>
              <FormattedMessage id="setup.removeGame" />
            </ToolButton>
          )}
        </div>
      </div>
      {saveStatus === "error" && saveError && (
        <p role="alert" className="font-bold text-danger">
          {formatError(saveError)}
        </p>
      )}
      {problemId && (
        <p role="alert" className="font-bold text-danger">
          <FormattedMessage id={problemId} />
        </p>
      )}
      <SetupTransferStatus transfer={transfer} />
      {game ? (
        <GameEditor
          key={game.id}
          game={game}
          update={update}
          selectedItemId={selectedItemId}
          onSelectItem={(itemId) => onSelectItem(game.id, itemId)}
          uploads={uploads}
          imagesEnabled={imagesEnabled}
        />
      ) : (
        <div className="flex flex-col items-start gap-5">
          <p className="text-lg text-fg-muted">
            <FormattedMessage id="setup.emptyBody" values={{ max: MAX_GAMES }} />
          </p>
          <GamePicker
            options={pickerOptions}
            onPick={onInsert}
            trigger={
              <Button size="lg">
                <FormattedMessage id="setup.addGame" />
              </Button>
            }
          />
        </div>
      )}
      <ConfirmDialog
        open={isConfirmingRemove}
        onOpenChange={setIsConfirmingRemove}
        title={<FormattedMessage id="setup.removeGameTitle" />}
        description={<FormattedMessage id="setup.cannotUndo" />}
        confirmLabel={<FormattedMessage id="setup.removeGame" />}
        cancelLabel={<FormattedMessage id="setup.keep" />}
        onConfirm={() => {
          onRemove();
          setIsConfirmingRemove(false);
        }}
        finalFocus={removeFocusRef}
      />
    </>
  );
};
