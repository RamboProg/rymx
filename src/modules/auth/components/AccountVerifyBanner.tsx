"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

// Shown on /account for a signed-in but unverified user. Access is never
// gated on verification (confirmed decision) — this is a nag only, backed by
// the server-trusted `emailVerified` claim (see src/modules/rbac/server).
export function AccountVerifyBanner() {
  const t = useTranslations("verifyEmail");

  return (
    <div className="border-rymx-gold/40 bg-rymx-gold/10 text-rymx-cream flex items-center justify-between gap-4 rounded-md border px-4 py-3 text-sm">
      <span>{t("bannerText")}</span>
      <Link href="/verify-email" className="text-rymx-gold hover:text-rymx-gold-hover shrink-0">
        {t("bannerLink")}
      </Link>
    </div>
  );
}
