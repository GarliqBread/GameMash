import { Toggle } from "@base-ui/react/toggle";
import { Extension } from "@tiptap/core";
import Bold from "@tiptap/extension-bold";
import Document from "@tiptap/extension-document";
import Italic from "@tiptap/extension-italic";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Underline from "@tiptap/extension-underline";
import { CharacterCount, Placeholder, UndoRedo } from "@tiptap/extensions";
import type { Node } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { type ReactNode, type Ref, useId, useImperativeHandle } from "react";
import { cn } from "../lib/cn.js";
import {
  RICH_TEXT_MARKS,
  type RichTextMark,
  type RichTextRun,
  richTextLength,
  runsFromEditor,
  runsToEditor,
} from "../lib/rich-text.js";

const WARNING_SHARE = 0.9;

const SingleParagraph = Document.extend({ content: "paragraph" });

const keepText = (text: string) => text;

const runCount = (doc: Node) => runsFromEditor(doc.toJSON()).length;

const RunLimit = Extension.create<{ maxRuns: number }>({
  name: "runLimit",
  addOptions: () => ({ maxRuns: Number.POSITIVE_INFINITY }),
  addProseMirrorPlugins() {
    const { maxRuns } = this.options;
    return [
      new Plugin({
        filterTransaction: (transaction, state) => {
          if (!transaction.docChanged) return true;
          const count = runCount(transaction.doc);
          return count <= maxRuns || count <= runCount(state.doc);
        },
      }),
    ];
  },
});

const MARK_GLYPHS: Record<RichTextMark, { glyph: string; className: string }> = {
  bold: { glyph: "B", className: "font-extrabold" },
  italic: { glyph: "I", className: "italic font-bold" },
  underline: { glyph: "U", className: "underline underline-offset-2 font-bold" },
};

export type RichTextFieldProps = {
  label: ReactNode;
  value: RichTextRun[];
  onValueChange: (value: RichTextRun[]) => void;
  maxLength: number;
  maxRuns: number;
  normalizeText?: ((text: string) => string) | undefined;
  counterLabel: (length: number, maxLength: number) => ReactNode;
  markLabels: Record<RichTextMark, string>;
  toolbarLabel: string;
  placeholder?: string | undefined;
  className?: string | undefined;
  ref?: Ref<HTMLElement | null> | undefined;
};

export const RichTextField = ({
  label,
  value,
  onValueChange,
  maxLength,
  maxRuns,
  normalizeText = keepText,
  counterLabel,
  markLabels,
  toolbarLabel,
  placeholder = "",
  className,
  ref,
}: RichTextFieldProps) => {
  const labelId = useId();
  const counterId = useId();
  const editor = useEditor({
    extensions: [
      SingleParagraph,
      Paragraph,
      Text,
      Bold,
      Italic,
      Underline,
      UndoRedo,
      CharacterCount.configure({ limit: maxLength }),
      RunLimit.configure({ maxRuns }),
      Placeholder.configure({ placeholder }),
    ],
    content: runsToEditor(value),
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "false",
        "aria-labelledby": labelId,
        "aria-describedby": counterId,
        class: cn(
          "focus-ring min-h-[92px] w-full rounded-field border-3 border-ink-950 bg-paper-white px-[18px] py-3.5",
          "font-display text-title-lg/[1.2] font-medium text-ink-950 shadow-brutal-md wrap-break-word",
          "[&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left",
          "[&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-fg-subtle",
          "[&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
          "[&_strong]:font-extrabold [&_u]:underline-offset-[0.14em]",
        ),
      },
      transformPastedText: (text) => normalizeText(text.replace(/\s+/g, " ")),
    },
    onUpdate: ({ editor: current }) => onValueChange(runsFromEditor(current.getJSON(), normalizeText)),
  });

  const active = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      Object.fromEntries(RICH_TEXT_MARKS.map((mark) => [mark, current.isActive(mark)])) as Record<
        RichTextMark,
        boolean
      >,
  });

  useImperativeHandle(ref, () => editor.view.dom, [editor]);

  const length = richTextLength(value);
  const isNearLimit = length >= maxLength * WARNING_SHARE;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-end justify-between gap-3">
        <span id={labelId} className="font-pixel tracking-pixel text-label font-bold text-ink-950">
          {label}
        </span>
        <div className="flex items-center gap-3">
          <span
            id={counterId}
            className={cn(
              "font-pixel tracking-pixel text-xs tabular-nums",
              isNearLimit ? "font-bold text-danger" : "text-fg-subtle",
            )}
          >
            {counterLabel(length, maxLength)}
          </span>
          <div role="toolbar" aria-label={toolbarLabel} className="flex gap-1.5">
            {RICH_TEXT_MARKS.map((mark) => (
              <Toggle
                key={mark}
                pressed={active[mark]}
                onMouseDown={(event) => event.preventDefault()}
                onPressedChange={() => editor.chain().focus().toggleMark(mark).run()}
                aria-label={markLabels[mark]}
                className={cn(
                  "focus-ring flex size-9 cursor-pointer items-center justify-center rounded-control border-3 border-ink-950 bg-paper-white",
                  "font-display text-body text-ink-950 shadow-brutal-xs motion-safe:transition-[translate,box-shadow,background-color]",
                  "data-[pressed]:translate-x-0.5 data-[pressed]:translate-y-0.5 data-[pressed]:bg-sun data-[pressed]:shadow-none",
                  MARK_GLYPHS[mark].className,
                )}
              >
                <span aria-hidden="true">{MARK_GLYPHS[mark].glyph}</span>
              </Toggle>
            ))}
          </div>
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};
