import type { ReactNode } from "react";
import { PlusIcon, TrashIcon } from "../icons/icons.js";
import { IconButton } from "../primitives/IconButton.js";
import { TextField } from "../primitives/TextField.js";
import { ToolButton } from "../workshop/ToolButton.js";

export type WordListItem = {
  id: string;
  value: string;
  inputLabel: string;
  removeLabel: string;
};

export type WordListEditorProps = {
  legend: ReactNode;
  words: WordListItem[];
  onWordChange: (id: string, value: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  addLabel: ReactNode;
  canAdd: boolean;
  canRemove: boolean;
  maxLength: number;
  placeholder?: string | undefined;
};

export const WordListEditor = ({
  legend,
  words,
  onWordChange,
  onRemove,
  onAdd,
  addLabel,
  canAdd,
  canRemove,
  maxLength,
  placeholder,
}: WordListEditorProps) => (
  <fieldset className="flex min-w-0 flex-col gap-4">
    <legend className="mb-4 font-pixel tracking-pixel text-caption font-bold">{legend}</legend>
    <ol className="flex flex-col gap-4">
      {words.map((word, index) => (
        <li key={word.id} className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-key border-3 border-ink-950 bg-brand-coral font-display text-key font-extrabold text-ink-950"
          >
            {index + 1}
          </span>
          <TextField
            label={word.inputLabel}
            hideLabel
            size="host"
            className="flex-1"
            controlClassName="h-14 font-display text-title-sm font-extrabold"
            value={word.value}
            maxLength={maxLength}
            placeholder={placeholder}
            onValueChange={(value: string) => onWordChange(word.id, value)}
          />
          <IconButton
            label={word.removeLabel}
            variant="secondary"
            size="md"
            disabled={!canRemove}
            onClick={() => onRemove(word.id)}
          >
            <TrashIcon size={18} strokeWidth={2.2} />
          </IconButton>
        </li>
      ))}
    </ol>
    <ToolButton
      icon={<PlusIcon size={18} strokeWidth={2.6} />}
      onClick={onAdd}
      disabled={!canAdd}
      className="self-start"
    >
      {addLabel}
    </ToolButton>
  </fieldset>
);
