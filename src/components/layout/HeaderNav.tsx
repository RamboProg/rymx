import Link from "next/link";
import { LogoutButton } from "@/modules/auth/components/LogoutButton";
import { CartBadge } from "@/modules/cart/components/CartBadge";

export function HeaderNav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="border-rymx-cream/10 bg-rymx-bg/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-8">
        <Link href="/" className="font-display text-rymx-cream text-lg font-bold tracking-[0.2em]">
          RYMX
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-8 sm:flex">
          <Link
            href="/shop"
            className="text-rymx-cream/70 hover:text-rymx-gold font-mono text-xs tracking-[0.1em] uppercase transition-colors"
          >
            Shop
          </Link>
          <Link
            href="/collections"
            className="text-rymx-cream/70 hover:text-rymx-gold font-mono text-xs tracking-[0.1em] uppercase transition-colors"
          >
            Collections
          </Link>
        </nav>

        <div className="flex items-center gap-5">
          {signedIn ? (
            <>
              <Link
                href="/account"
                className="text-rymx-cream/70 hover:text-rymx-gold font-mono text-xs tracking-[0.1em] uppercase transition-colors"
              >
                Account
              </Link>
              <LogoutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="text-rymx-cream/70 hover:text-rymx-gold font-mono text-xs tracking-[0.1em] uppercase transition-colors"
            >
              Sign in
            </Link>
          )}
          <CartBadge />
        </div>
      </div>
    </header>
  );
}
