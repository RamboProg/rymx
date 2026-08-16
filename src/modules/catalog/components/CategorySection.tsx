"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Category, Product } from "../schema";
import { ProductGrid } from "./ProductGrid";

const PAGE_SIZE = 10;

// One category's section on the default /shop view. Shows the first 10
// products (the grid already wraps responsively); if there are more, a
// "View all" button expands the section in place — no navigation, no extra
// fetch, since the full list is already loaded server-side.
export function CategorySection({
  category,
  products,
}: {
  category: Category;
  products: Product[];
}) {
  const t = useTranslations("shop");
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? products : products.slice(0, PAGE_SIZE);
  const hasMore = products.length > PAGE_SIZE;

  return (
    <section className="flex flex-col gap-6">
      <h2 className="font-display text-rymx-cream text-2xl font-bold tracking-tight uppercase">
        {category.title}
      </h2>
      <ProductGrid products={visible} />
      {hasMore && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-rymx-cream/70 hover:text-rymx-gold self-start font-mono text-xs tracking-[0.1em] uppercase transition-colors"
        >
          {t("viewAll", { count: products.length })}
        </button>
      )}
    </section>
  );
}
