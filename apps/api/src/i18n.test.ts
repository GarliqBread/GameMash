import { describe, expect, it } from "vitest";
import { getIntl, resolveLocale } from "./i18n.js";

describe("resolveLocale", () => {
  it("falls back to the default locale when missing or unsupported", () => {
    expect(resolveLocale(undefined)).toBe("en");
    expect(resolveLocale("xx")).toBe("en");
  });

  it("matches on the language part of a region tag", () => {
    expect(resolveLocale("en-GB")).toBe("en");
  });
});

describe("getIntl", () => {
  it("formats ICU messages from the shared catalog", () => {
    const intl = getIntl("en");

    expect(intl.formatMessage({ id: "home.serverStatus" }, { status: "up" })).toBe("Server: online");
  });
});
