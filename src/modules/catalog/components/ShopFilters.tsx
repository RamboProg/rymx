"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/Select";
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
      <div className="w-48">
        <label htmlFor="shop-filter-category" className="sr-only">
          Filter by category
        </label>
        <Select
          id="shop-filter-category"
          value={searchParams.get("category") || "all"}
          onValueChange={(value) => updateParam("category", value === "all" ? "" : value)}
          options={[
            { value: "all", label: "All categories" },
            ...categories.map((c) => ({ value: c.slug, label: c.title })),
          ]}
        />
      </div>
      <div className="w-48">
        <label htmlFor="shop-filter-sort" className="sr-only">
          Sort products
        </label>
        <Select
          id="shop-filter-sort"
          value={searchParams.get("sort") ?? "newest"}
          onValueChange={(value) => updateParam("sort", value)}
          options={[
            { value: "newest", label: "Newest" },
            { value: "price-asc", label: "Price: low to high" },
            { value: "price-desc", label: "Price: high to low" },
          ]}
        />
      </div>
    </div>
  );
}
