import { useTranslations } from "next-intl";
import Link from "next/link";
import { LogoutButton } from "@/modules/auth/components/LogoutButton";
import { CartBadge } from "@/modules/cart/components/CartBadge";
import { LocaleToggle } from "./LocaleToggle";
import { MobileMenu } from "./MobileMenu";

const linkClass =
  "text-rymx-cream/70 hover:text-rymx-gold font-mono text-xs tracking-[0.1em] uppercase transition-colors";
const dashboardLinkClass =
  "text-rymx-gold hover:text-rymx-gold-hover font-mono text-xs tracking-[0.1em] uppercase transition-colors";

// Stays a plain (non-async) component — useTranslations works in Server
// Components too, but keeping this synchronous is what lets it render in
// RTL unit tests (see Header.test.tsx) the same way it always has.
export function HeaderNav({ signedIn, staff = false }: { signedIn: boolean; staff?: boolean }) {
  const t = useTranslations("header");

  const navLinks = (
    <>
      <Link href="/shop" className={linkClass}>
        {t("shop")}
      </Link>
      <Link href="/collections" className={linkClass}>
        {t("collections")}
      </Link>
      {staff && (
        <Link href="/admin" className={dashboardLinkClass}>
          {t("dashboard")}
        </Link>
      )}
    </>
  );

  const accountLinks = signedIn ? (
    <>
      <Link href="/account" className={linkClass}>
        {t("account")}
      </Link>
      <LogoutButton />
    </>
  ) : (
    <Link href="/login" className={linkClass}>
      {t("signIn")}
    </Link>
  );

  return (
    <header className="border-rymx-cream/10 bg-rymx-bg/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-8">
        <Link href="/" className="font-display text-rymx-cream text-lg font-bold tracking-[0.2em]">
          RYMX
        </Link>

        <nav aria-label={t("mainNav")} className="hidden items-center gap-8 sm:flex">
          {navLinks}
        </nav>

        <div className="flex items-center gap-5">
          <div className="hidden items-center gap-5 sm:flex">{accountLinks}</div>
          <CartBadge />
          <LocaleToggle />
          <MobileMenu label={t("mainNav")}>
            <div className="flex flex-col gap-3">{navLinks}</div>
            <div className="border-rymx-cream/10 mt-3 flex flex-col gap-3 border-t pt-3">
              {accountLinks}
            </div>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
