import type { ByteRange } from "./image-store.js";

const RANGE = /^bytes=(\d*)-(\d*)$/;

export type RangeRequest = { kind: "full" } | { kind: "partial"; range: ByteRange } | { kind: "unsatisfiable" };

const FULL: RangeRequest = { kind: "full" };
const UNSATISFIABLE: RangeRequest = { kind: "unsatisfiable" };

const suffix = (length: number, size: number): RangeRequest =>
  length > 0 && size > 0
    ? { kind: "partial", range: { start: Math.max(0, size - length), end: size - 1 } }
    : UNSATISFIABLE;

export const parseRange = (header: string | undefined, size: number): RangeRequest => {
  const [, from = "", to = ""] = RANGE.exec(header?.trim() ?? "") ?? [];
  if (!header || (!from && !to)) return FULL;
  if (!from) return suffix(Number(to), size);
  const start = Number(from);
  const end = to ? Math.min(Number(to), size - 1) : size - 1;
  if (start >= size || start > end) return UNSATISFIABLE;
  return { kind: "partial", range: { start, end } };
};
