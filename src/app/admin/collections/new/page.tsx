import type { Metadata } from "next";
import { CollectionForm } from "@/modules/collections/components/admin/CollectionForm";
import { listAllProducts } from "@/modules/catalog/server/admin";

export const metadata: Metadata = { title: "New collection — Admin — RYMX" };

export default async function NewCollectionPage() {
  const products = await listAllProducts();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-rymx-cream text-2xl font-bold">New collection</h1>
      <CollectionForm products={products} />
    </div>
  );
}
