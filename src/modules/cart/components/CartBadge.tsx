"use client";

import Link from "next/link";
import { useCart } from "../hooks/useCart";

export function CartBadge() {
  const { cart } = useCart();

  return (
    <Link
      href="/cart"
      className="text-rymx-cream/70 hover:text-rymx-gold font-mono text-xs tracking-[0.1em] uppercase transition-colors"
    >
      Cart ({cart.itemCount})
    </Link>
  );
}
