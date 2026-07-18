import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/modules/catalog/components/ProductGrid";
import { shopSearchParamsSchema } from "@/modules/catalog/schema";
import { listShopProducts } from "@/modules/catalog/server";
import { getLiveCollectionBySlug } from "@/modules/collections/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getLiveCollectionBySlug(slug);
  if (!collection) return { title: "Collection not found — RYMX" };
  return { title: `${collection.title} — RYMX`, description: collection.description };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = await getLiveCollectionBySlug(slug);
  if (!collection) notFound();

  const { products } = await listShopProducts(
    shopSearchParamsSchema.parse({}),
    collection.productIds,
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-12 sm:px-8">
      <div>
        <h1 className="font-display text-rymx-cream text-3xl font-bold">{collection.title}</h1>
        {collection.description && (
          <p className="text-rymx-cream/70 mt-2 font-sans text-sm">{collection.description}</p>
        )}
      </div>
      <ProductGrid products={products} />
    </div>
  );
}
