// Shared locale constants for the site-wide i18n layer. Any page can read/write
// the `locale` cookie via LocaleToggle to switch language.
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
