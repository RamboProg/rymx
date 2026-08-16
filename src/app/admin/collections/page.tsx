import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { Table, Td, Th } from "@/components/admin/Table";
import { Button } from "@/components/ui/Button";
import { CollectionActiveToggle } from "@/modules/collections/components/admin/CollectionActiveToggle";
import { CollectionDeleteButton } from "@/modules/collections/components/admin/CollectionDeleteButton";
import { isCollectionLive } from "@/modules/collections/schema";
import { listAllCollectionsAdmin } from "@/modules/collections/server/admin";

export const metadata: Metadata = { title: "Collections — Admin — RYMX" };

export default async function AdminCollectionsPage() {
  const [collections, t, locale] = await Promise.all([
    listAllCollectionsAdmin(),
    getTranslations("pages.collections"),
    getLocale(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-rymx-cream text-2xl font-bold">{t("title")}</h1>
          <p className="text-rymx-cream/50 font-sans text-sm">{t("description")}</p>
        </div>
        <Button href="/admin/collections/new">{t("new")}</Button>
      </div>

      {collections.length === 0 ? (
        <p className="text-rymx-cream/50 font-mono text-sm">{t("empty")}</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("colTitle")}</Th>
              <Th>{t("colProducts")}</Th>
              <Th>{t("colStatus")}</Th>
              <Th>{t("colActions")}</Th>
            </tr>
          </thead>
          <tbody>
            {collections.map((collection) => (
              <tr key={collection.id}>
                <Td>
                  <Link
                    href={`/admin/collections/${collection.id}`}
                    className="hover:text-rymx-gold"
                  >
                    {collection.title}
                  </Link>
                </Td>
                <Td>{collection.productIds.length}</Td>
                <Td>
                  {!collection.active
                    ? t("statusInactive")
                    : isCollectionLive(collection.publishAt)
                      ? t("statusLive")
                      : t("statusScheduled", {
                          when: collection.publishAt!.toLocaleString(locale),
                        })}
                </Td>
                <Td>
                  <div className="flex items-center gap-4">
                    <CollectionActiveToggle id={collection.id} active={collection.active} />
                    <CollectionDeleteButton id={collection.id} />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
