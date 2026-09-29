import { GAMES, gameDefinition, isGameId } from "@gamemash/games";
import {
  type GameSetup,
  isGameReady,
  isQuestionComplete,
  isSetupReady,
  MAX_GAMES,
  SESSION_NAME_MAX_LENGTH,
  type SessionSetup,
} from "@gamemash/games/config";
import {
  AutosaveIndicator,
  Button,
  ConfirmDialog,
  GamePicker,
  type GamePickerOption,
  Heading,
  InsertGameSlot,
  Logo,
  PlayIcon,
  SectionTab,
  SessionNameSticker,
  ToolButton,
  TrashIcon,
  TrustNote,
  WorkshopShell,
} from "@gamemash/ui";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import type { HostCredentials } from "../../lib/credentials";
import { useErrorMessage } from "../../lib/errors";
import { DrawItEditor } from "./DrawItEditor";
import { DrawItRules } from "./DrawItRules";
import { QuizEditor } from "./QuizEditor";
import { QuizRules } from "./QuizRules";
import { SetupLineup } from "./SetupLineup";
import { addGame, newGame, removeGame, reorderGames, updateDrawItConfig, updateQuizConfig } from "./setup-changes";
import { useImageUploads } from "./useImageUploads";
import { useSetupEditor } from "./useSetupEditor";

const problemOf = (games: GameSetup[]) => {
  const unready = games.find((game) => !isGameReady(game));
  if (!unready) return games.length === 0 ? "needGame" : null;
  return unready.type === "draw-it" ? "needWords" : "needComplete";
};

export type SetupWorkshopProps = {
  credentials: HostCredentials;
  initialSetup: SessionSetup;
  imagesEnabled: boolean;
};

export const SetupWorkshop = ({ credentials, initialSetup, imagesEnabled }: SetupWorkshopProps) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const formatError = useErrorMessage();
  const { setup, status, saveError, update, flush } = useSetupEditor(credentials, initialSetup);
  const uploads = useImageUploads(credentials);
  const [selectedGameId, setSelectedGameId] = useState(initialSetup.games[0]?.id);
  const [selectedQuestions, setSelectedQuestions] = useState<Record<string, string>>({});
  const [hasTriedToOpen, setHasTriedToOpen] = useState(false);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const insertSlotRef = useRef<HTMLButtonElement>(null);

  const game = setup.games.find((item) => item.id === selectedGameId) ?? setup.games[0];
  const selectQuestion = (gameId: string, questionId: string) =>
    setSelectedQuestions((current) => ({ ...current, [gameId]: questionId }));

  const pickerOptions: GamePickerOption[] = Object.values(GAMES).map((definition) => {
    const Icon = definition.icon;
    return {
      id: definition.id,
      title: intl.formatMessage({ id: definition.titleId }),
      description: intl.formatMessage({ id: definition.descriptionId }),
      accent: definition.accent,
      icon: <Icon />,
    };
  });

  const handleInsert = (type: string) => {
    if (!isGameId(type)) return;
    const game = newGame(type);
    update((current) => addGame(current, game));
    setSelectedGameId(game.id);
  };

  const handleRemove = () => {
    if (!game) return;
    const index = setup.games.indexOf(game);
    const neighbour = setup.games[index + 1] ?? setup.games[index - 1];
    update((current) => removeGame(current, game.id));
    setSelectedGameId(neighbour?.id);
    setIsConfirmingRemove(false);
  };

  const handleOpenLobby = async () => {
    setHasTriedToOpen(true);
    const unready = setup.games.find((item) => !isGameReady(item));
    if (setup.games.length === 0 || unready) {
      if (unready) {
        setSelectedGameId(unready.id);
        const incomplete =
          unready.type === "pop-quiz"
            ? unready.config.questions.find((question) => !isQuestionComplete(question))
            : undefined;
        if (incomplete) selectQuestion(unready.id, incomplete.id);
      }
      return;
    }
    if (await flush())
      void navigate({
        to: "/host/$sessionId",
        params: { sessionId: credentials.sessionId },
      });
  };

  const problem = !hasTriedToOpen || isSetupReady(setup) ? null : problemOf(setup.games);

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
            onSelect={setSelectedGameId}
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
        <>
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              {game && (
                <SectionTab as="span" variant="accent">
                  <FormattedMessage id={gameDefinition(game.type).titleId} />
                </SectionTab>
              )}
              <Heading size="host">
                <FormattedMessage
                  id={!game ? "setup.emptyTitle" : game.type === "draw-it" ? "setup.editWords" : "setup.editQuestions"}
                />
              </Heading>
            </div>
            <div className="flex items-center gap-4">
              <AutosaveIndicator
                status={status}
                onRetry={() => void flush()}
                labels={{
                  saving: <FormattedMessage id="setup.saving" />,
                  saved: <FormattedMessage id="setup.saved" />,
                  error: <FormattedMessage id="setup.saveFailed" />,
                }}
              />
              {game && (
                <ToolButton
                  icon={<TrashIcon size={18} strokeWidth={2.2} />}
                  onClick={() => setIsConfirmingRemove(true)}
                >
                  <FormattedMessage id="setup.removeGame" />
                </ToolButton>
              )}
            </div>
          </div>
          {status === "error" && saveError && (
            <p role="alert" className="font-bold text-danger">
              {formatError(saveError)}
            </p>
          )}
          {problem && (
            <p role="alert" className="font-bold text-danger">
              <FormattedMessage id={`setup.${problem}`} />
            </p>
          )}
          {game?.type === "draw-it" ? (
            <DrawItEditor
              key={game.id}
              config={game.config}
              onChange={(change) => update((current) => updateDrawItConfig(current, game.id, change))}
            />
          ) : game ? (
            <QuizEditor
              key={game.id}
              config={game.config}
              onChange={(change) => update((current) => updateQuizConfig(current, game.id, change))}
              selectedQuestionId={selectedQuestions[game.id]}
              onSelectQuestion={(questionId) => selectQuestion(game.id, questionId)}
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
                onPick={handleInsert}
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
            onConfirm={handleRemove}
            finalFocus={insertSlotRef}
          />
        </>
      }
      settings={
        game?.type === "draw-it" ? (
          <DrawItRules
            config={game.config}
            onChange={(change) => update((current) => updateDrawItConfig(current, game.id, change))}
          />
        ) : game ? (
          <QuizRules
            config={game.config}
            onChange={(change) => update((current) => updateQuizConfig(current, game.id, change))}
          />
        ) : null
      }
    />
  );
};
