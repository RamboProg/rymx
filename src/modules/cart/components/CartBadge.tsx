"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCart } from "../hooks/useCart";

export function CartBadge() {
  const { cart } = useCart();
  const t = useTranslations("cart");

  return (
    <Link
      href="/cart"
      className="text-rymx-cream/70 hover:text-rymx-gold flex items-center gap-1.5 font-mono text-xs tracking-[0.1em] uppercase transition-colors"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.5 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 7.5H6" />
      </svg>
      <span>{t("badge", { count: cart.itemCount })}</span>
    </Link>
  );
}
