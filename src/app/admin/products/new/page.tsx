import type { Metadata } from "next";
import { ProductForm } from "@/modules/catalog/components/admin/ProductForm";
import { listCategories } from "@/modules/catalog/server";

export const metadata: Metadata = { title: "New product — Admin — RYMX" };

export default async function NewProductPage() {
  const categories = await listCategories();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-rymx-cream text-2xl font-bold">New product</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
