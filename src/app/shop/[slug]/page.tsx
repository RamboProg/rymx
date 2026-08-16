import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/modules/catalog/components/ProductGallery";
import { VariantSelector } from "@/modules/catalog/components/VariantSelector";
import { getProductBySlug, listVariants } from "@/modules/catalog/server";
import { productSeoDescription, productSeoTitle } from "@/modules/catalog/services/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    const t = await getTranslations("shop");
    return { title: t("productNotFoundTitle") };
  }
  return {
    title: productSeoTitle(product.title),
    description: productSeoDescription(product.title, product.description),
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const variants = await listVariants(product.id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EGP",
      lowPrice: (product.minPriceMinor / 100).toFixed(2),
      ...(product.compareAtMinor != null && product.compareAtMinor > product.minPriceMinor
        ? { highPrice: (product.compareAtMinor / 100).toFixed(2) }
        : {}),
      offerCount: variants.length,
    },
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-12 px-6 py-12 sm:px-8 lg:grid-cols-2">
      <script
        type="application/ld+json"
        // JSON.stringify of our own server-fetched data; </script> is escaped
        // so a product title/description can never break out of the tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ProductGallery media={product.media} title={product.title} />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-rymx-cream text-2xl font-bold">{product.title}</h1>
          {product.description && (
            <p className="text-rymx-cream/70 mt-3 font-sans text-sm">{product.description}</p>
          )}
        </div>
        <VariantSelector product={product} variants={variants} />
      </div>
    </div>
  );
}
