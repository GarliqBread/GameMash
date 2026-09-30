import { describe, expect, it } from "vitest";
import { hasHiddenCharacters, stripHiddenCharacters } from "./text.js";

describe("hidden characters", () => {
  it.each([
    ["a right-to-left override", "Friday‮mash"],
    ["a zero-width space", "Fri​day"],
    ["a soft hyphen", "Fri­day"],
    ["a control character", "Fri\u0007day"],
    ["a zero-width joiner outside an emoji", "Fri‍day"],
    ["a tag character outside a flag", "Fri\u{E0041}day"],
  ])("spots %s", (_, text) => {
    expect(hasHiddenCharacters(text)).toBe(true);
    expect(stripHiddenCharacters(text)).toBe(text.includes("Friday") ? "Fridaymash" : "Friday");
  });

  it("strips a stray joiner but keeps the emoji next to it", () => {
    expect(stripHiddenCharacters("Ana 👩‍💻‍")).toBe("Ana 👩‍💻");
  });

  it.each([
    ["an emoji joined with a zero-width joiner", "Team 👩‍💻"],
    ["an emoji with a skin tone and a joiner", "Team 👩🏽‍💻"],
    ["an emoji with a variation selector and a joiner", "Pride 🏳️‍🌈"],
    ["a flag made of tag characters", "Go 🏴󠁧󠁢󠁳󠁣󠁴󠁿"],
    ["plain accented text", "Olá, São Paulo"],
  ])("leaves %s alone", (_, text) => {
    expect(hasHiddenCharacters(text)).toBe(false);
    expect(stripHiddenCharacters(text)).toBe(text);
  });
});
