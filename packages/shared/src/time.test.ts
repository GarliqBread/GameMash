import { describe, expect, it } from "vitest";
import { formatClock } from "./time.js";

describe("formatClock", () => {
  it.each([
    [0, "0:00"],
    [999, "0:01"],
    [102_000, "1:42"],
    [120_000, "2:00"],
    [-5, "0:00"],
  ])("shows %i ms as %s", (ms, expected) => {
    expect(formatClock(ms)).toBe(expected);
  });
});
