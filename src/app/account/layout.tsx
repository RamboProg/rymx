import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { redirect } from "next/navigation";
import { AccountVerifyBanner } from "@/modules/auth/components/AccountVerifyBanner";
import { getSessionClaims } from "@/modules/rbac/server";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const claims = await getSessionClaims();
  if (!claims) {
    redirect("/login?next=/account");
  }

  // Localized like the verify-email page (see src/app/(auth)/verify-email/page.tsx)
  // — scoped here just so the nag banner below can use the same `verifyEmail`
  // messages; the rest of the account area stays English until migrated.
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-12 sm:px-8">
      {!claims.emailVerified && (
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AccountVerifyBanner />
        </NextIntlClientProvider>
      )}
      {children}
    </div>
  );
}
