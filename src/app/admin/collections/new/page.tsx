import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CollectionForm } from "@/modules/collections/components/admin/CollectionForm";
import { listAllProducts } from "@/modules/catalog/server/admin";

export const metadata: Metadata = { title: "New collection — Admin — RYMX" };

export default async function NewCollectionPage() {
  const [products, t] = await Promise.all([listAllProducts(), getTranslations("collections")]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-rymx-cream text-2xl font-bold">{t("newTitle")}</h1>
      <CollectionForm products={products} />
    </div>
  );
}
