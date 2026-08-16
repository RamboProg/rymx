import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StatTile } from "@/components/admin/StatTile";
import { Table, Td, Th } from "@/components/admin/Table";
import { formatEGP } from "@/lib/money";
import {
  getDiscountPerformanceReport,
  getInventoryValueMinor,
  getMostReturnedItemsReport,
  getReturnReasonsReport,
  getSalesReport,
  getTopProductsReport,
  getTrendingCollectionsReport,
  getTrendingProductsReport,
} from "@/modules/analytics/server";
import { RETURN_REASONS } from "@/modules/returns/schema";
import { listLowStock } from "@/modules/inventory/server";

export const metadata: Metadata = { title: "Analytics — Admin — RYMX" };

function ExportLink({ report, label }: { report: string; label: string }) {
  return (
    <a
      href={`/api/admin/analytics/export?report=${report}`}
      className="text-rymx-cream/50 hover:text-rymx-gold font-mono text-xs tracking-[0.1em] uppercase"
    >
      {label}
    </a>
  );
}

export default async function AdminAnalyticsPage() {
  const [
    sales,
    topProducts,
    discountPerformance,
    inventoryValueMinor,
    lowStock,
    trendingProducts,
    trendingCollections,
    mostReturnedItems,
    returnReasons,
  ] = await Promise.all([
    getSalesReport(30),
    getTopProductsReport(10),
    getDiscountPerformanceReport(),
    getInventoryValueMinor(),
    listLowStock(),
    getTrendingProductsReport(10, 30),
    getTrendingCollectionsReport(10, 30),
    getMostReturnedItemsReport(10),
    getReturnReasonsReport(),
  ]);
  const t = await getTranslations("pages.analytics");
  const tReasons = await getTranslations("returns");

  const totalRevenueMinor = sales.reduce((sum, d) => sum + d.revenueMinor, 0);
  const totalOrders = sales.reduce((sum, d) => sum + d.orderCount, 0);
  const maxDailyRevenue = Math.max(1, ...sales.map((d) => d.revenueMinor));

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-rymx-cream text-2xl font-bold">{t("title")}</h1>
        <p className="text-rymx-cream/50 font-sans text-sm">{t("description")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label={t("statRevenue")} value={formatEGP(totalRevenueMinor)} />
        <StatTile label={t("statOrders")} value={String(totalOrders)} />
        <StatTile label={t("statInventoryValue")} value={formatEGP(inventoryValueMinor)} />
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-rymx-cream text-lg font-bold">{t("salesHeading")}</h2>
          <ExportLink report="sales" label={t("exportCsv")} />
        </div>
        <div className="flex h-32 items-end gap-1">
          {sales.map((day) => (
            <div
              key={day.date}
              title={`${day.date}: ${formatEGP(day.revenueMinor)} (${day.orderCount} orders)`}
              className="bg-rymx-gold/70 hover:bg-rymx-gold min-w-[3px] flex-1 rounded-t-sm transition-colors"
              style={{ height: `${Math.max(2, (day.revenueMinor / maxDailyRevenue) * 100)}%` }}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-rymx-cream text-lg font-bold">
            {t("topProductsHeading")}
          </h2>
          <ExportLink report="products" label={t("exportCsv")} />
        </div>
        {topProducts.length === 0 ? (
          <p className="text-rymx-cream/50 font-mono text-sm">{t("noSales")}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("colProduct")}</Th>
                <Th>{t("colQuantitySold")}</Th>
                <Th>{t("colRevenue")}</Th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p) => (
                <tr key={p.productId}>
                  <Td>{p.title}</Td>
                  <Td>{p.quantitySold}</Td>
                  <Td>{formatEGP(p.revenueMinor)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-rymx-cream text-lg font-bold">
            {t("discountPerformanceHeading")}
          </h2>
          <ExportLink report="discounts" label={t("exportCsv")} />
        </div>
        {discountPerformance.length === 0 ? (
          <p className="text-rymx-cream/50 font-mono text-sm">{t("noPromoRedeemed")}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("colCode")}</Th>
                <Th>{t("colRedemptions")}</Th>
                <Th>{t("colDiscountGiven")}</Th>
              </tr>
            </thead>
            <tbody>
              {discountPerformance.map((d) => (
                <tr key={d.code}>
                  <Td>{d.code}</Td>
                  <Td>{d.redeemedCount}</Td>
                  <Td>{formatEGP(d.discountGivenMinor)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-rymx-cream text-lg font-bold">
            {t("lowStockHeading")}
          </h2>
          <ExportLink report="inventory" label={t("exportCsv")} />
        </div>
        {lowStock.length === 0 ? (
          <p className="text-rymx-cream/50 font-mono text-sm">{t("nothingLowStock")}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("colProduct")}</Th>
                <Th>{t("colSku")}</Th>
                <Th>{t("colStock")}</Th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((row) => (
                <tr key={row.variantId}>
                  <Td>{row.productTitle}</Td>
                  <Td>{row.sku}</Td>
                  <Td>{row.stock}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-rymx-cream text-lg font-bold">
          {t("trendingProductsHeading")}
        </h2>
        {trendingProducts.length === 0 ? (
          <p className="text-rymx-cream/50 font-mono text-sm">{t("noSalesWindow")}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("colProduct")}</Th>
                <Th>{t("colQuantitySold")}</Th>
                <Th>{t("colRevenue")}</Th>
              </tr>
            </thead>
            <tbody>
              {trendingProducts.map((p) => (
                <tr key={p.productId}>
                  <Td>{p.title}</Td>
                  <Td>{p.quantitySold}</Td>
                  <Td>{formatEGP(p.revenueMinor)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-rymx-cream text-lg font-bold">
          {t("trendingCollectionsHeading")}
        </h2>
        {trendingCollections.length === 0 ? (
          <p className="text-rymx-cream/50 font-mono text-sm">{t("noSalesWindow")}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("colCollection")}</Th>
                <Th>{t("colQuantitySold")}</Th>
                <Th>{t("colRevenue")}</Th>
              </tr>
            </thead>
            <tbody>
              {trendingCollections.map((c) => (
                <tr key={c.collectionId}>
                  <Td>{c.title}</Td>
                  <Td>{c.quantitySold}</Td>
                  <Td>{formatEGP(c.revenueMinor)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-rymx-cream text-lg font-bold">
          {t("mostReturnedHeading")}
        </h2>
        {mostReturnedItems.length === 0 ? (
          <p className="text-rymx-cream/50 font-mono text-sm">{t("noReturns")}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("colProduct")}</Th>
                <Th>{t("colQuantityReturned")}</Th>
              </tr>
            </thead>
            <tbody>
              {mostReturnedItems.map((item) => (
                <tr key={item.productId}>
                  <Td>{item.title}</Td>
                  <Td>{item.quantityReturned}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-rymx-cream text-lg font-bold">
          {t("returnReasonsHeading")}
        </h2>
        {returnReasons.length === 0 ? (
          <p className="text-rymx-cream/50 font-mono text-sm">{t("noReturns")}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("colReason")}</Th>
                <Th>{t("colCount")}</Th>
              </tr>
            </thead>
            <tbody>
              {returnReasons.map((r) => (
                <tr key={r.reasonCategory}>
                  <Td>
                    {RETURN_REASONS.some((reason) => reason.value === r.reasonCategory)
                      ? tReasons(`reasons.${r.reasonCategory}`)
                      : r.reasonCategory}
                  </Td>
                  <Td>{r.count}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </div>
  );
}
