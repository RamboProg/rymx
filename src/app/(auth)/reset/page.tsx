import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ResetForm } from "@/modules/auth/components/ResetForm";

export const metadata: Metadata = { title: "Reset password — RYMX" };

export default async function ResetPage() {
  const t = await getTranslations("reset");
  return (
    <>
      <h1 className="font-display text-rymx-cream text-2xl font-bold">{t("title")}</h1>
      <ResetForm />
      <p className="text-rymx-cream/50 text-center font-mono text-xs">
        <Link href="/login" className="hover:text-rymx-gold">
          {t("backToSignIn")}
        </Link>
      </p>
    </>
  );
}
