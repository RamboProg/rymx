import type { Metadata } from "next";
import { ProductForm } from "@/modules/catalog/components/admin/ProductForm";
import { listCategories } from "@/modules/catalog/server";
import { listAllOptions } from "@/modules/catalog/server/admin";

export const metadata: Metadata = { title: "New product — Admin — RYMX" };

export default async function NewProductPage() {
  const [categories, existingOptions] = await Promise.all([listCategories(), listAllOptions()]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-rymx-cream text-2xl font-bold">New product</h1>
      <ProductForm categories={categories} existingOptions={existingOptions} />
    </div>
  );
}
