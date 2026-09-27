import { ERROR_CODES, errorMessageId } from "@gamemash/shared";
import { describe, expect, it } from "vitest";
import { catalogs, SUPPORTED_LOCALES } from "./index.js";

describe.each(SUPPORTED_LOCALES)("%s catalog", (locale) => {
  const catalog: Record<string, string> = catalogs[locale];

  it.each(ERROR_CODES)("has a message for error code %s", (code) => {
    expect(catalog[errorMessageId(code)]).toBeTruthy();
  });

  it("has the same keys as the default catalog", () => {
    expect(Object.keys(catalog).sort()).toEqual(Object.keys(catalogs.en).sort());
  });
});
