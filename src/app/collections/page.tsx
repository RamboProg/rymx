import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { listLiveCollections } from "@/modules/collections/server";

export const metadata: Metadata = { title: "Collections — RYMX" };

export default async function CollectionsPage() {
  const collections = await listLiveCollections();
  const t = await getTranslations("collectionsPublic");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-12 sm:px-8">
      <h1 className="font-display text-rymx-cream text-3xl font-bold">{t("title")}</h1>
      {collections.length === 0 ? (
        <p className="text-rymx-cream/50 font-mono text-sm">{t("empty")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => {
            const image = collection.media[0];
            return (
              <Link
                key={collection.id}
                href={`/collections/${collection.slug}`}
                className="group flex flex-col gap-3"
              >
                <div className="bg-rymx-card relative aspect-[4/3] w-full overflow-hidden rounded-md">
                  {image ? (
                    <Image
                      src={image.url}
                      alt={image.alt || collection.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, 100vw"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="font-display text-rymx-cream/20 text-sm tracking-[0.2em] uppercase">
                        RYMX
                      </span>
                    </div>
                  )}
                </div>
                <h3 className="text-rymx-cream font-sans text-sm">{collection.title}</h3>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
