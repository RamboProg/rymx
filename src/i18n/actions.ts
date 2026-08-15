"use server";

import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE, type Locale } from "./locale";

// Persists the admin's language choice in the `locale` cookie so the next
// server render (after router.refresh) picks it up. Not httpOnly — it's a UI
// preference with no security significance.
export async function setLocaleAction(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
