import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MerchandisingPanel } from "@/modules/catalog/components/admin/MerchandisingPanel";
import { getProductSoldQuantities } from "@/modules/catalog/server";
import { listAllProducts } from "@/modules/catalog/server/admin";
import { getCatalogDisplay } from "@/modules/settings/server";

export const metadata: Metadata = { title: "Merchandising — Admin — RYMX" };

export default async function AdminMerchandisingPage() {
  const [products, display, soldMap, t] = await Promise.all([
    listAllProducts(),
    getCatalogDisplay(),
    getProductSoldQuantities(),
    getTranslations("merchandising"),
  ]);

  const activeProducts = products.filter((p) => p.status === "active");
  const soldByProductId = Object.fromEntries(soldMap.entries());

  // Keep manual order in sync with the active catalog: drop removed ids, append new ones.
  const known = new Set(activeProducts.map((p) => p.id));
  const manualOrderIds = [
    ...display.manualOrderIds.filter((id) => known.has(id)),
    ...activeProducts.map((p) => p.id).filter((id) => !display.manualOrderIds.includes(id)),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-rymx-cream text-2xl font-bold">{t("title")}</h1>
        <p className="text-rymx-cream/50 font-sans text-sm">{t("description")}</p>
      </div>
      <MerchandisingPanel
        products={activeProducts}
        soldByProductId={soldByProductId}
        display={{ ...display, manualOrderIds }}
      />
    </div>
  );
}
