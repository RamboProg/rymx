import type { MetadataRoute } from "next";
import { listAllActiveProducts } from "@/modules/catalog/server";
import { listLiveCollections } from "@/modules/collections/server";
import { getSiteUrl } from "@/lib/siteUrl";

// Rendered on demand, not statically at build time: a static sitemap would
// freeze the product/collection list as of the last deploy (never picking up
// anything added afterward) and would also hard-fail the build itself if
// Firestore is briefly unreachable during `next build`.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const [products, collections] = await Promise.all([
    listAllActiveProducts(),
    listLiveCollections(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/collections`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/policies/returns`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/policies/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/policies/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${siteUrl}/shop/${product.slug}`,
    lastModified: product.createdAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const collectionRoutes: MetadataRoute.Sitemap = collections.map((collection) => ({
    url: `${siteUrl}/collections/${collection.slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes, ...collectionRoutes];
}
