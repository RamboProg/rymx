"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Category } from "../schema";

export function ShopFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <select
        aria-label="Filter by category"
        value={searchParams.get("category") ?? ""}
        onChange={(e) => updateParam("category", e.target.value)}
        className="border-rymx-cream/20 bg-rymx-card text-rymx-cream rounded-md border px-3 py-2 font-mono text-xs uppercase"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.slug}>
            {c.title}
          </option>
        ))}
      </select>
      <select
        aria-label="Sort products"
        value={searchParams.get("sort") ?? "newest"}
        onChange={(e) => updateParam("sort", e.target.value)}
        className="border-rymx-cream/20 bg-rymx-card text-rymx-cream rounded-md border px-3 py-2 font-mono text-xs uppercase"
      >
        <option value="newest">Newest</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
      </select>
    </div>
  );
}
