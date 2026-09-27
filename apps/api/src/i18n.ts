import { createIntl, createIntlCache, type IntlShape } from "@formatjs/intl";
import { catalogs, DEFAULT_LOCALE, isLocale, type Locale } from "@gamemash/messages";

const cache = createIntlCache();
const intls = new Map<Locale, IntlShape>();

export const resolveLocale = (requested: string | undefined): Locale => {
  if (!requested) return DEFAULT_LOCALE;
  if (isLocale(requested)) return requested;
  const language = requested.split("-")[0] ?? "";
  return isLocale(language) ? language : DEFAULT_LOCALE;
};

export const getIntl = (locale: Locale) => {
  const existing = intls.get(locale);
  if (existing) return existing;
  const intl = createIntl({ locale, defaultLocale: DEFAULT_LOCALE, messages: catalogs[locale] }, cache);
  intls.set(locale, intl);
  return intl;
};
