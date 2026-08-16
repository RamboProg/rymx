import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { LoginForm } from "@/modules/auth/components/LoginForm";

export const metadata: Metadata = { title: "Sign in — RYMX" };

export default async function LoginPage() {
  const t = await getTranslations("login");
  return (
    <>
      <h1 className="font-display text-rymx-cream text-2xl font-bold">{t("title")}</h1>
      <LoginForm />
      <p className="text-rymx-cream/50 text-center font-mono text-xs">
        {t("noAccount")}{" "}
        <Link href="/register" className="text-rymx-gold hover:text-rymx-gold-hover">
          {t("register")}
        </Link>
      </p>
      <p className="text-rymx-cream/50 text-center font-mono text-xs">
        <Link href="/reset" className="hover:text-rymx-gold">
          {t("forgotPassword")}
        </Link>
      </p>
    </>
  );
}
