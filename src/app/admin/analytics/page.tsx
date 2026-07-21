import type { Metadata } from "next";
import { StatTile } from "@/components/admin/StatTile";
import { Table, Td, Th } from "@/components/admin/Table";
import { formatEGP } from "@/lib/money";
import {
  getDiscountPerformanceReport,
  getInventoryValueMinor,
  getSalesReport,
  getTopProductsReport,
} from "@/modules/analytics/server";
import { listLowStock } from "@/modules/inventory/server";

export const metadata: Metadata = { title: "Analytics — Admin — RYMX" };

function ExportLink({ report }: { report: string }) {
  return (
    <a
      href={`/api/admin/analytics/export?report=${report}`}
      className="text-rymx-cream/50 hover:text-rymx-gold font-mono text-xs tracking-[0.1em] uppercase"
    >
      Export CSV
    </a>
  );
}

export default async function AdminAnalyticsPage() {
  const [sales, topProducts, discountPerformance, inventoryValueMinor, lowStock] =
    await Promise.all([
      getSalesReport(30),
      getTopProductsReport(10),
      getDiscountPerformanceReport(),
      getInventoryValueMinor(),
      listLowStock(),
    ]);

  const totalRevenueMinor = sales.reduce((sum, d) => sum + d.revenueMinor, 0);
  const totalOrders = sales.reduce((sum, d) => sum + d.orderCount, 0);
  const maxDailyRevenue = Math.max(1, ...sales.map((d) => d.revenueMinor));

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-display text-rymx-cream text-2xl font-bold">Analytics</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Revenue (30d)" value={formatEGP(totalRevenueMinor)} />
        <StatTile label="Orders (30d)" value={String(totalOrders)} />
        <StatTile label="Inventory value" value={formatEGP(inventoryValueMinor)} />
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-rymx-cream text-lg font-bold">Sales — last 30 days</h2>
          <ExportLink report="sales" />
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
          <h2 className="font-display text-rymx-cream text-lg font-bold">Top products</h2>
          <ExportLink report="products" />
        </div>
        {topProducts.length === 0 ? (
          <p className="text-rymx-cream/50 font-mono text-sm">No sales yet.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Quantity sold</Th>
                <Th>Revenue</Th>
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
          <h2 className="font-display text-rymx-cream text-lg font-bold">Discount performance</h2>
          <ExportLink report="discounts" />
        </div>
        {discountPerformance.length === 0 ? (
          <p className="text-rymx-cream/50 font-mono text-sm">No promo codes redeemed yet.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Redemptions</Th>
                <Th>Discount given</Th>
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
          <h2 className="font-display text-rymx-cream text-lg font-bold">Low stock</h2>
          <ExportLink report="inventory" />
        </div>
        {lowStock.length === 0 ? (
          <p className="text-rymx-cream/50 font-mono text-sm">Nothing low on stock.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>SKU</Th>
                <Th>Stock</Th>
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
    </div>
  );
}
