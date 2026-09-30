import type { ReactNode } from "react";
import { type RichTextRun, richTextLength } from "../lib/rich-text.js";

export type RichTextProps = {
  runs: RichTextRun[];
};

const wrap = (run: RichTextRun) => {
  const text: ReactNode = run.text;
  const underlined = run.underline ? <u className="underline-offset-[0.14em]">{text}</u> : text;
  const italic = run.italic ? <em>{underlined}</em> : underlined;
  return run.bold ? <strong className="font-extrabold">{italic}</strong> : italic;
};

const withOffsets = (runs: RichTextRun[]) =>
  runs.map((run, index) => ({ run, offset: richTextLength(runs.slice(0, index)) }));

export const RichText = ({ runs }: RichTextProps) =>
  withOffsets(runs).map(({ run, offset }) => <span key={offset}>{wrap(run)}</span>);
