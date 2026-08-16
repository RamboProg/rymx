import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { RegisterForm } from "@/modules/auth/components/RegisterForm";

export const metadata: Metadata = { title: "Register — RYMX" };

export default async function RegisterPage() {
  const t = await getTranslations("register");
  return (
    <>
      <h1 className="font-display text-rymx-cream text-2xl font-bold">{t("title")}</h1>
      <RegisterForm />
      <p className="text-rymx-cream/50 text-center font-mono text-xs">
        {t("alreadyHaveAccount")}{" "}
        <Link href="/login" className="text-rymx-gold hover:text-rymx-gold-hover">
          {t("signIn")}
        </Link>
      </p>
    </>
  );
}
