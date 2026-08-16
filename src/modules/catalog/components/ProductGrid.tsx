"use client";

import { useTranslations } from "next-intl";
import type { Product } from "../schema";
import { ProductCard } from "./ProductCard";

export function ProductGrid({ products }: { products: Product[] }) {
  const t = useTranslations("shop");
  if (products.length === 0) {
    return <p className="text-rymx-cream/50 font-mono text-sm">{t("noMatches")}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
