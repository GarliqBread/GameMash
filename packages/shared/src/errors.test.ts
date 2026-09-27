import { describe, expect, it } from "vitest";
import { errorMessageId } from "./errors.js";

describe("errorMessageId", () => {
  it("prefixes the code with the error namespace", () => {
    expect(errorMessageId("not_found")).toBe("error.not_found");
  });
});
