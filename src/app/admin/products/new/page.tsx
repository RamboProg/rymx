import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProductForm } from "@/modules/catalog/components/admin/ProductForm";
import { listCategories } from "@/modules/catalog/server";
import { listAllOptions } from "@/modules/catalog/server/admin";

export const metadata: Metadata = { title: "New product — Admin — RYMX" };

export default async function NewProductPage() {
  const [categories, existingOptions, t] = await Promise.all([
    listCategories(),
    listAllOptions(),
    getTranslations("productForm"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-rymx-cream text-2xl font-bold">{t("newTitle")}</h1>
      <ProductForm categories={categories} existingOptions={existingOptions} />
    </div>
  );
}
