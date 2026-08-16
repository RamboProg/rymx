"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { formatEGP } from "@/lib/money";
import type { ShippingSettings } from "@/modules/settings/schema";
import { computeShippingFeeMinor } from "@/modules/settings/services/shipping";
import { useCart } from "../hooks/useCart";

export function CartView({ shippingSettings }: { shippingSettings: ShippingSettings }) {
  const t = useTranslations("cart");
  const { cart, loading, pending, updateQuantity, remove } = useCart();

  if (loading) {
    return <p className="text-rymx-cream/60 font-mono text-sm">{t("loading")}</p>;
  }

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-6">
        <p className="text-rymx-cream/60 font-mono text-sm">{t("empty")}</p>
        <Button href="/shop">{t("shopTheCollection")}</Button>
      </div>
    );
  }

  const shippingFeeMinor = computeShippingFeeMinor(cart.subtotalMinor, shippingSettings);

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
                  {t("quantityFor", { title: line.title })}
                </label>
                <div className="w-20">
                  <Select
                    id={`qty-${line.variantId}`}
                    value={String(line.quantity)}
                    disabled={pending}
                    onValueChange={(v) => updateQuantity(line.variantId, Number(v))}
                    options={Array.from({ length: Math.min(line.stock, 10) }, (_, i) => i + 1).map(
                      (n) => ({ value: String(n), label: String(n) }),
                    )}
                  />
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(line.variantId)}
                  className="text-rymx-cream/50 font-mono text-xs tracking-[0.1em] uppercase hover:text-red-400"
                >
                  {t("remove")}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-rymx-cream/10 bg-rymx-card flex h-fit flex-col gap-4 rounded-md border p-6">
        <div className="text-rymx-cream/70 flex justify-between font-mono text-sm">
          <span>{t("subtotal")}</span>
          <span>{formatEGP(cart.subtotalMinor)}</span>
        </div>
        <div className="text-rymx-cream/70 flex justify-between font-mono text-sm">
          <span>{t("shipping")}</span>
          <span>{shippingFeeMinor === 0 ? t("free") : formatEGP(shippingFeeMinor)}</span>
        </div>
        {shippingFeeMinor > 0 && shippingSettings.freeShippingThresholdMinor !== null && (
          <p className="text-rymx-cream/40 font-mono text-xs">
            {t("freeShippingOver", {
              amount: formatEGP(shippingSettings.freeShippingThresholdMinor),
            })}
          </p>
        )}
        <Button href="/checkout" className="justify-center">
          {t("continueToCheckout")}
        </Button>
      </div>
    </div>
  );
}
