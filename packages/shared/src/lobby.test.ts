import { describe, expect, it } from "vitest";
import { normalizePlayerName, playerNameKey } from "./lobby.js";

describe("player names", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizePlayerName("  Anne   Sophie ")).toBe("Anne Sophie");
  });

  it("treats names that differ only in case or composition as the same", () => {
    expect(playerNameKey("PRIYA")).toBe(playerNameKey("priya"));
    expect(playerNameKey("Zoë")).toBe(playerNameKey("Zoë"));
  });
});

describe("player name keys", () => {
  it("treats full-width look-alikes as the same name", () => {
    expect(playerNameKey("Ｐｒｉｙａ")).toBe(playerNameKey("Priya"));
  });
});
