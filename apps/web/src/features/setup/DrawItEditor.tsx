import { DRAW_IT_MAX_WORDS, DRAW_IT_WORD_MAX_LENGTH, type DrawItConfig } from "@gamemash/games/config";
import { stripHiddenCharacters } from "@gamemash/shared";
import { WordListEditor } from "@gamemash/ui";
import { FormattedMessage, useIntl } from "react-intl";
import { addWord, changeWord, deleteWord, newWordId } from "./setup-changes";

export type DrawItEditorProps = {
  config: DrawItConfig;
  onChange: (change: (config: DrawItConfig) => DrawItConfig) => void;
};

export const DrawItEditor = ({ config, onChange }: DrawItEditorProps) => {
  const intl = useIntl();
  return (
    <WordListEditor
      legend={<FormattedMessage id="setup.words" />}
      words={config.words.map((word, index) => ({
        id: word.id,
        value: word.text,
        inputLabel: intl.formatMessage({ id: "setup.wordLabel" }, { position: index + 1 }),
        removeLabel: intl.formatMessage({ id: "setup.removeWord" }, { position: index + 1 }),
      }))}
      onWordChange={(id, value) => onChange((current) => changeWord(current, id, stripHiddenCharacters(value)))}
      onRemove={(id) => onChange((current) => deleteWord(current, id))}
      onAdd={() => {
        const id = newWordId();
        onChange((current) => addWord(current, id));
      }}
      addLabel={<FormattedMessage id="setup.addWord" />}
      canAdd={config.words.length < DRAW_IT_MAX_WORDS}
      canRemove={config.words.length > 1}
      maxLength={DRAW_IT_WORD_MAX_LENGTH}
      placeholder={intl.formatMessage({ id: "setup.wordPlaceholder" })}
    />
  );
};
