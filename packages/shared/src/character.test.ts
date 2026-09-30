import croodles from "@dicebear/styles/croodles.json" with { type: "json" };
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { CHARACTER_PART_COUNTS, randomCharacter } from "./character.js";
import { CharacterSchema } from "./schemas.js";

const variantCount = (component: keyof typeof croodles.components) =>
  Object.keys(croodles.components[component].variants).length;

describe("characters", () => {
  it("offers exactly the parts the Croodles style has", () => {
    expect(CHARACTER_PART_COUNTS).toEqual({
      head: variantCount("head"),
      eyes: variantCount("eyes"),
      nose: variantCount("nose"),
      mouth: variantCount("mouth"),
      top: variantCount("top"),
      topColor: croodles.colors.top.values.length,
      beard: variantCount("beard"),
      mustache: variantCount("mustache"),
    });
  });

  it("creates random characters that pass the schema", () => {
    for (let index = 0; index < 200; index += 1) expect(Value.Check(CharacterSchema, randomCharacter())).toBe(true);
  });

  it("picks the last part and facial hair when the dice roll high or low", () => {
    const highest = randomCharacter(() => 0.999);
    expect(highest.top).toBe(CHARACTER_PART_COUNTS.top - 1);
    expect(highest.beard).toBeNull();
    expect(randomCharacter(() => 0).beard).toBe(0);
  });

  it("rejects parts the style doesn't have", () => {
    const character = randomCharacter();
    expect(Value.Check(CharacterSchema, { ...character, top: CHARACTER_PART_COUNTS.top })).toBe(false);
    expect(Value.Check(CharacterSchema, { ...character, eyes: 1.5 })).toBe(false);
    expect(Value.Check(CharacterSchema, { ...character, hat: 1 })).toBe(false);
  });
});
