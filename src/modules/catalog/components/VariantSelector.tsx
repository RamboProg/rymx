"use client";

import { useMemo, useState } from "react";
import { formatEGP } from "@/lib/money";
import { useCart } from "@/modules/cart/hooks/useCart";
import type { Product, Variant } from "../schema";

function matchVariant(variants: Variant[], selected: Record<string, string>): Variant | undefined {
  return variants.find((v) =>
    Object.entries(selected).every(
      ([key, value]) =>
        // eslint-disable-next-line security/detect-object-injection -- key comes from this product's own option names, not free-text user input
        v.optionValues[key] === value,
    ),
  );
}

export function VariantSelector({ product, variants }: { product: Product; variants: Variant[] }) {
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    product.options.forEach((opt) => {
      initial[opt.name] = opt.values[0]!;
    });
    return initial;
  });

  const variant = useMemo(() => matchVariant(variants, selected), [variants, selected]);
  const { add, pending } = useCart();
  // Tracks which variant the "Added to cart" confirmation applies to, so
  // switching size/color resets it without needing an effect.
  const [addedFor, setAddedFor] = useState<string | null>(null);
  const added = addedFor !== null && addedFor === variant?.id;

  function onAddToCart() {
    if (!variant) return;
    add({ productId: product.id, variantId: variant.id, quantity: 1 });
    setAddedFor(variant.id);
  }

  return (
    <div className="flex flex-col gap-6">
      {product.options.map((option) => (
        <div key={option.name} className="flex flex-col gap-2">
          <span className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
            {option.name}
          </span>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const isSelected = selected[option.name] === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelected((prev) => ({ ...prev, [option.name]: value }))}
                  aria-pressed={isSelected}
                  className={`rounded-full border px-4 py-2 font-mono text-xs uppercase transition-colors ${
                    isSelected
                      ? "border-rymx-gold text-rymx-gold"
                      : "border-rymx-cream/20 text-rymx-cream/70 hover:border-rymx-gold hover:text-rymx-gold"
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-3">
        <p className="text-rymx-gold font-mono text-lg">
          {formatEGP(variant ? variant.priceMinor : product.minPriceMinor)}
        </p>
        {variant && variant.stock === 0 && (
          <p className="font-mono text-xs text-red-400 uppercase">Out of stock</p>
        )}
        <button
          type="button"
          onClick={onAddToCart}
          disabled={!variant || variant.stock === 0 || pending}
          className="border-rymx-gold text-rymx-gold hover:bg-rymx-gold disabled:border-rymx-cream/20 disabled:text-rymx-cream/30 rounded-full border px-6 py-3 font-mono text-xs tracking-[0.1em] uppercase transition-colors hover:text-[#12100a] disabled:pointer-events-none"
        >
          {pending ? "Adding…" : added ? "Added to cart" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}
