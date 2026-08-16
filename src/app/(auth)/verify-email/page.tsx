import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { dirForLocale, type Locale } from "@/i18n/locale";
import { VerifyEmailView } from "@/modules/auth/components/VerifyEmailView";

export const metadata: Metadata = { title: "Verify email — RYMX" };

// Localized like the admin area (see src/app/admin/layout.tsx): reads the
// same `locale` cookie via next-intl, scoped to just this page rather than
// the whole (auth) route group so login/register/reset — still English-only —
// aren't half-translated by accident.
export default async function VerifyEmailPage() {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = dirForLocale(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div dir={dir}>
        <VerifyEmailView />
      </div>
    </NextIntlClientProvider>
  );
}
