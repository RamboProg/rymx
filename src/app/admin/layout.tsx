import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Cairo } from "next/font/google";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { dirForLocale, type Locale } from "@/i18n/locale";
import { getSessionClaims } from "@/modules/rbac/server";
import { isStaff } from "@/modules/rbac/services/permissions";

// Arabic-capable font for the admin area (the site's display/body fonts are
// latin-only). Applied to the admin wrapper only when the locale is Arabic.
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-cairo",
});

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const claims = await getSessionClaims();
  if (!claims || !isStaff(claims.role)) {
    redirect("/login?next=/admin");
  }

  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = dirForLocale(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div
        dir={dir}
        className={`${cairo.variable} mx-auto flex w-full max-w-7xl gap-10 px-6 py-10 sm:px-8`}
        style={locale === "ar" ? { fontFamily: "var(--font-cairo)" } : undefined}
      >
        <AdminSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </NextIntlClientProvider>
  );
}
