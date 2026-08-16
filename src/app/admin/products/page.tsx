import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Table, Td, Th } from "@/components/admin/Table";
import { Button } from "@/components/ui/Button";
import { formatEGP } from "@/lib/money";
import { listAllProducts } from "@/modules/catalog/server/admin";

export const metadata: Metadata = { title: "Products — Admin — RYMX" };

export default async function AdminProductsPage() {
  const [products, t, tStatus] = await Promise.all([
    listAllProducts(),
    getTranslations("products"),
    getTranslations("productStatus"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-rymx-cream text-2xl font-bold">{t("title")}</h1>
          <p className="text-rymx-cream/50 font-sans text-sm">{t("description")}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/products/import"
            className="text-rymx-cream/60 hover:text-rymx-gold font-mono text-xs tracking-[0.1em] uppercase"
          >
            {t("importCsv")}
          </Link>
          <Button href="/admin/products/new">{t("new")}</Button>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="text-rymx-cream/50 font-mono text-sm">{t("empty")}</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("colTitle")}</Th>
              <Th>{t("colStatus")}</Th>
              <Th>{t("colCategory")}</Th>
              <Th>{t("colPrice")}</Th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <Td>
                  <Link href={`/admin/products/${product.id}`} className="hover:text-rymx-gold">
                    {product.title}
                  </Link>
                </Td>
                <Td>{tStatus(product.status)}</Td>
                <Td>{product.category ?? "—"}</Td>
                <Td>{formatEGP(product.minPriceMinor)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
