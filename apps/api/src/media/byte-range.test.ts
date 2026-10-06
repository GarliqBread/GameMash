import { describe, expect, it } from "vitest";
import { parseRange } from "./byte-range.js";

describe("parseRange", () => {
  it.each([
    ["bytes=0-99", { kind: "partial", range: { start: 0, end: 99 } }],
    ["bytes=900-", { kind: "partial", range: { start: 900, end: 999 } }],
    ["bytes=900-5000", { kind: "partial", range: { start: 900, end: 999 } }],
    ["bytes=-100", { kind: "partial", range: { start: 900, end: 999 } }],
    ["bytes=-5000", { kind: "partial", range: { start: 0, end: 999 } }],
  ])("reads %s", (header, expected) => {
    expect(parseRange(header, 1000)).toEqual(expected);
  });

  it.each(["bytes=1000-", "bytes=50-10", "bytes=-0"])("refuses %s", (header) => {
    expect(parseRange(header, 1000)).toEqual({ kind: "unsatisfiable" });
  });

  it.each([undefined, "", "bytes=0-1,5-9", "items=0-9", "bytes=-"])("sends the whole file for %s", (header) => {
    expect(parseRange(header, 1000)).toEqual({ kind: "full" });
  });
});
