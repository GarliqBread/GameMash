import type { JSONContent } from "@tiptap/core";

export type RichTextMark = "bold" | "italic" | "underline";

export const RICH_TEXT_MARKS: RichTextMark[] = ["bold", "italic", "underline"];

export type RichTextRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

export const richTextLength = (runs: RichTextRun[]) => runs.reduce((length, run) => length + run.text.length, 0);

const marksOf = (node: JSONContent) =>
  RICH_TEXT_MARKS.filter((mark) => node.marks?.some((item) => item.type === mark) ?? false);

const sameMarks = (a: RichTextRun, b: RichTextRun) => RICH_TEXT_MARKS.every((mark) => !a[mark] === !b[mark]);

const toRun = (text: string, marks: RichTextMark[]): RichTextRun =>
  Object.fromEntries([["text", text], ...marks.map((mark) => [mark, true])]) as RichTextRun;

const mergeRuns = (runs: RichTextRun[]) => {
  const starts = runs.flatMap((run, index) => {
    const previous = runs[index - 1];
    return previous && sameMarks(previous, run) ? [] : [index];
  });
  return starts.map((start, position) => ({
    ...runs[start],
    text: runs
      .slice(start, starts[position + 1])
      .map((run) => run.text)
      .join(""),
  }));
};

export const runsFromEditor = (doc: JSONContent, normalizeText = (text: string) => text): RichTextRun[] =>
  mergeRuns(
    (doc.content ?? [])
      .flatMap((block) => block.content ?? [])
      .filter((node) => node.type === "text")
      .map((node) => toRun(normalizeText(node.text ?? ""), marksOf(node)))
      .filter((run) => run.text.length > 0),
  );

export const runsToEditor = (runs: RichTextRun[]): JSONContent => ({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: runs
        .filter((run) => run.text.length > 0)
        .map((run) => ({
          type: "text",
          text: run.text,
          marks: RICH_TEXT_MARKS.filter((mark) => run[mark]).map((type) => ({ type })),
        })),
    },
  ],
});
