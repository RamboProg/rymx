// Shared locale constants for the admin i18n layer. Public pages stay English;
// only the admin area reads/writes the `locale` cookie and switches language.
export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "ar";
}

// Arabic reads right-to-left; everything else ltr.
export function dirForLocale(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
