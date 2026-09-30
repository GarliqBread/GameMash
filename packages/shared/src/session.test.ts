import { describe, expect, it } from "vitest";
import { isRoomCode, normalizeRoomCode, ROOM_CODE_ALPHABET } from "./session.js";

describe("room codes", () => {
  it("never uses the easily confused letters I and O", () => {
    expect(ROOM_CODE_ALPHABET).not.toMatch(/[IO]/);
    expect(ROOM_CODE_ALPHABET).toHaveLength(24);
  });

  it("normalizes whitespace and case", () => {
    expect(normalizeRoomCode("  kwpx ")).toBe("KWPX");
  });

  it("accepts only four letters from the alphabet", () => {
    expect(isRoomCode("KWPX")).toBe(true);
    expect(isRoomCode("KWP")).toBe(false);
    expect(isRoomCode("KWPO")).toBe(false);
    expect(isRoomCode("KW1X")).toBe(false);
  });
});
