import type { Metadata } from "next";
import { ProductGrid } from "@/modules/catalog/components/ProductGrid";
import { ShopFilters } from "@/modules/catalog/components/ShopFilters";
import { ShopPagination } from "@/modules/catalog/components/ShopPagination";
import { SHOP_PAGE_SIZE, shopSearchParamsSchema } from "@/modules/catalog/schema";
import {
  listCategories,
  listShopProducts,
  listShopProductsByCategory,
} from "@/modules/catalog/server";

export const metadata: Metadata = { title: "Shop — RYMX" };

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = shopSearchParamsSchema.safeParse({
    category: typeof raw.category === "string" ? raw.category : undefined,
    sort: typeof raw.sort === "string" ? raw.sort : undefined,
    page: typeof raw.page === "string" ? raw.page : undefined,
  });
  const params = parsed.success ? parsed.data : shopSearchParamsSchema.parse({});

  const categories = await listCategories();

  // With a category selected, keep the flat, paginated single-category grid.
  if (params.category) {
    const { products, total } = await listShopProducts(params);
    const hasMore = params.page * SHOP_PAGE_SIZE < total;
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-12 sm:px-8">
        <h1 className="font-display text-rymx-cream text-3xl font-bold">Shop</h1>
        <ShopFilters categories={categories} />
        <ProductGrid products={products} />
        <ShopPagination page={params.page} hasMore={hasMore} />
      </div>
    );
  }

  // Default view: a section per category (big heading + grid), in category order.
  const sections = await listShopProductsByCategory(params.sort);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 py-12 sm:px-8">
      <h1 className="font-display text-rymx-cream text-3xl font-bold">Shop</h1>
      <ShopFilters categories={categories} />
      {sections.length === 0 ? (
        <p className="text-rymx-cream/50 font-mono text-sm">No products yet.</p>
      ) : (
        sections.map((section) => (
          <section key={section.category.id} className="flex flex-col gap-6">
            <h2 className="font-display text-rymx-cream text-2xl font-bold tracking-tight uppercase">
              {section.category.title}
            </h2>
            <ProductGrid products={section.products} />
          </section>
        ))
      )}
    </div>
  );
}
