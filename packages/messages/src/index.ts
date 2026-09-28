import en from "./locales/en.json" with { type: "json" };

export type MessageId = keyof typeof en;
export type Catalog = Record<MessageId, string>;

export const DEFAULT_LOCALE = "en";

export const catalogs = { en } satisfies Record<string, Catalog>;

export type Locale = keyof typeof catalogs;

export const SUPPORTED_LOCALES = Object.keys(catalogs) as Locale[];

export const isLocale = (value: string): value is Locale => Object.hasOwn(catalogs, value);
