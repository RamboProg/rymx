"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { formatEGP } from "@/lib/money";
import {
  computeShippingFeeMinor,
  FREE_SHIPPING_THRESHOLD_MINOR,
} from "@/modules/orders/services/pricing";
import { useCart } from "../hooks/useCart";

export function CartView() {
  const { cart, loading, pending, updateQuantity, remove } = useCart();

  if (loading) {
    return <p className="text-rymx-cream/60 font-mono text-sm">Loading your cart…</p>;
  }

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-6">
        <p className="text-rymx-cream/60 font-mono text-sm">Your cart is empty.</p>
        <Button href="/shop">Shop the collection</Button>
      </div>
    );
  }

  const shippingFeeMinor = computeShippingFeeMinor(cart.subtotalMinor);

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-6">
        {cart.issues.map((issue) => (
          <p key={issue} role="alert" className="font-mono text-xs text-red-400">
            {issue}
          </p>
        ))}

        {cart.lines.map((line) => (
          <div key={line.variantId} className="border-rymx-cream/10 flex gap-4 border-b pb-6">
            <div className="bg-rymx-card relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-md">
              {line.image ? (
                <Image
                  src={line.image}
                  alt={line.title}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link href={`/shop/${line.slug}`} className="text-rymx-cream font-sans text-sm">
                    {line.title}
                  </Link>
                  {Object.values(line.optionValues).length > 0 && (
                    <p className="text-rymx-cream/50 font-mono text-xs">
                      {Object.values(line.optionValues).join(" / ")}
                    </p>
                  )}
                </div>
                <p className="text-rymx-gold font-mono text-sm">{formatEGP(line.lineTotalMinor)}</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="sr-only" htmlFor={`qty-${line.variantId}`}>
                  Quantity for {line.title}
                </label>
                <select
                  id={`qty-${line.variantId}`}
                  value={line.quantity}
                  disabled={pending}
                  onChange={(e) => updateQuantity(line.variantId, Number(e.target.value))}
                  className="border-rymx-cream/20 bg-rymx-card text-rymx-cream rounded-md border px-2 py-1 font-mono text-xs"
                >
                  {Array.from({ length: Math.min(line.stock, 10) }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(line.variantId)}
                  className="text-rymx-cream/50 font-mono text-xs tracking-[0.1em] uppercase hover:text-red-400"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-rymx-cream/10 bg-rymx-card flex h-fit flex-col gap-4 rounded-md border p-6">
        <div className="text-rymx-cream/70 flex justify-between font-mono text-sm">
          <span>Subtotal</span>
          <span>{formatEGP(cart.subtotalMinor)}</span>
        </div>
        <div className="text-rymx-cream/70 flex justify-between font-mono text-sm">
          <span>Shipping</span>
          <span>{shippingFeeMinor === 0 ? "Free" : formatEGP(shippingFeeMinor)}</span>
        </div>
        {shippingFeeMinor > 0 && (
          <p className="text-rymx-cream/40 font-mono text-xs">
            Free shipping over {formatEGP(FREE_SHIPPING_THRESHOLD_MINOR)}
          </p>
        )}
        <Button href="/checkout" className="justify-center">
          Continue to checkout
        </Button>
      </div>
    </div>
  );
}
