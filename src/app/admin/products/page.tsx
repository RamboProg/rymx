import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Table, Td, Th } from "@/components/admin/Table";
import { Button } from "@/components/ui/Button";
import { formatEGP } from "@/lib/money";
import { PRODUCT_STATUSES, type ProductStatus } from "@/modules/catalog/schema";
import { listAllProducts } from "@/modules/catalog/server/admin";

export const metadata: Metadata = { title: "Products — Admin — RYMX" };

const STATUS_FILTERS: (ProductStatus | "all")[] = ["all", ...PRODUCT_STATUSES];

function productsHref(status: ProductStatus | "all", q?: string) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (q?.trim()) params.set("q", q.trim());
  const qs = params.toString();
  return qs ? `/admin/products?${qs}` : "/admin/products";
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status: rawStatus, q } = await searchParams;
  const status = STATUS_FILTERS.includes(rawStatus as ProductStatus | "all")
    ? (rawStatus as ProductStatus | "all")
    : "all";

  const [products, t, tStatus] = await Promise.all([
    listAllProducts(),
    getTranslations("products"),
    getTranslations("productStatus"),
  ]);

  const needle = q?.trim().toLowerCase() ?? "";
  const filtered = products
    .filter((product) => status === "all" || product.status === status)
    .filter((product) => {
      if (!needle) return true;
      return (
        product.title.toLowerCase().includes(needle) ||
        product.slug.toLowerCase().includes(needle) ||
        (product.category?.toLowerCase().includes(needle) ?? false) ||
        product.tags.some((tag) => tag.toLowerCase().includes(needle))
      );
    });

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

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <Link
              key={s}
              href={productsHref(s, q)}
              className={`rounded-full border px-3 py-1 font-mono text-xs tracking-[0.1em] uppercase ${
                status === s
                  ? "border-rymx-gold text-rymx-gold"
                  : "border-rymx-cream/20 text-rymx-cream/60 hover:text-rymx-cream"
              }`}
            >
              {tStatus(s)}
            </Link>
          ))}
        </div>
        <form className="ms-auto">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder={t("searchPlaceholder")}
            className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-2 text-sm outline-none"
          />
        </form>
      </div>

      {filtered.length === 0 ? (
        <p className="text-rymx-cream/50 font-mono text-sm">
          {products.length === 0 ? t("empty") : t("noMatch")}
        </p>
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
            {filtered.map((product) => (
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
