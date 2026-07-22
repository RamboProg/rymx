import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/modules/catalog/components/admin/ProductForm";
import { VariantManager } from "@/modules/catalog/components/admin/VariantManager";
import { listCategories, listVariants } from "@/modules/catalog/server";
import { getProductForAdmin, listAllOptions } from "@/modules/catalog/server/admin";

export const metadata: Metadata = { title: "Edit product — Admin — RYMX" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories, existingOptions] = await Promise.all([
    getProductForAdmin(id),
    listCategories(),
    listAllOptions(),
  ]);
  if (!product) notFound();

  const variants = await listVariants(product.id);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-rymx-cream text-2xl font-bold">{product.title}</h1>
        <p className="text-rymx-cream/50 font-mono text-xs">/shop/{product.slug}</p>
      </div>

      <ProductForm product={product} categories={categories} existingOptions={existingOptions} />

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-rymx-cream text-lg font-bold">Variants</h2>
        <VariantManager productId={product.id} variants={variants} options={product.options} />
      </section>
    </div>
  );
}
