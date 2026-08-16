import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CategorySection } from "@/modules/catalog/components/CategorySection";
import { ProductGrid } from "@/modules/catalog/components/ProductGrid";
import { ShopFilters } from "@/modules/catalog/components/ShopFilters";
import { ShopPagination } from "@/modules/catalog/components/ShopPagination";
import { SHOP_PAGE_SIZE, shopSearchParamsSchema, type ShopSort } from "@/modules/catalog/schema";
import {
  listCategories,
  listShopProducts,
  listShopProductsByCategory,
} from "@/modules/catalog/server";
import { getCatalogDisplay } from "@/modules/settings/server";

export const metadata: Metadata = { title: "Shop — RYMX" };

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const display = await getCatalogDisplay();
  const hasExplicitSort = typeof raw.sort === "string" && raw.sort.length > 0;
  const parsed = shopSearchParamsSchema.safeParse({
    category: typeof raw.category === "string" ? raw.category : undefined,
    sort: hasExplicitSort ? raw.sort : display.defaultSort,
    page: typeof raw.page === "string" ? raw.page : undefined,
  });
  const params = parsed.success
    ? parsed.data
    : shopSearchParamsSchema.parse({ sort: display.defaultSort });
  const sort = params.sort as ShopSort;

  const [categories, t] = await Promise.all([listCategories(), getTranslations("shop")]);

  // With a category selected, keep the flat, paginated single-category grid.
  if (params.category) {
    const { products, total } = await listShopProducts(params);
    const hasMore = params.page * SHOP_PAGE_SIZE < total;
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-12 sm:px-8">
        <h1 className="font-display text-rymx-cream text-3xl font-bold">{t("title")}</h1>
        <ShopFilters categories={categories} defaultSort={display.defaultSort} />
        <ProductGrid products={products} />
        <ShopPagination page={params.page} hasMore={hasMore} />
      </div>
    );
  }

  // Default view: a section per category (big heading + grid, capped at 10
  // with "View all"), in category order. Product order follows catalog display.
  const sections = await listShopProductsByCategory(sort);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 py-12 sm:px-8">
      <h1 className="font-display text-rymx-cream text-3xl font-bold">{t("title")}</h1>
      <ShopFilters categories={categories} defaultSort={display.defaultSort} />
      {sections.length === 0 ? (
        <p className="text-rymx-cream/50 font-mono text-sm">{t("noProductsYet")}</p>
      ) : (
        sections.map((section) => (
          <CategorySection
            key={section.category.id}
            category={section.category}
            products={section.products}
          />
        ))
      )}
    </div>
  );
}
