import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionForm } from "@/modules/collections/components/admin/CollectionForm";
import { getCollectionForAdmin } from "@/modules/collections/server/admin";
import { listAllProducts } from "@/modules/catalog/server/admin";

export const metadata: Metadata = { title: "Edit collection — Admin — RYMX" };

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [collection, products] = await Promise.all([getCollectionForAdmin(id), listAllProducts()]);
  if (!collection) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-rymx-cream text-2xl font-bold">{collection.title}</h1>
      <CollectionForm collection={collection} products={products} />
    </div>
  );
}
