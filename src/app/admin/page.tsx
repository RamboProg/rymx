import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StatTile } from "@/components/admin/StatTile";
import { formatEGP } from "@/lib/money";
import { listAllProducts } from "@/modules/catalog/server/admin";
import { listLowStock } from "@/modules/inventory/server";
import { listAllOrders } from "@/modules/orders/server";

export const metadata: Metadata = { title: "Admin — RYMX" };

export default async function AdminDashboardPage() {
  const [products, orders, lowStock, t] = await Promise.all([
    listAllProducts(),
    listAllOrders(),
    listLowStock(),
    getTranslations("dashboard"),
  ]);

  const revenueMinor = orders.reduce((sum, order) => sum + order.totalMinor, 0);

  const salesByTitle = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.items) {
      salesByTitle.set(item.title, (salesByTitle.get(item.title) ?? 0) + item.quantity);
    }
  }
  const topProducts = [...salesByTitle.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-rymx-cream text-2xl font-bold">{t("title")}</h1>
        <p className="text-rymx-cream/50 font-sans text-sm">{t("description")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label={t("statProducts")} value={String(products.length)} />
        <StatTile label={t("statOrders")} value={String(orders.length)} />
        <StatTile label={t("statRevenue")} value={formatEGP(revenueMinor)} />
        <StatTile label={t("statLowStock")} value={String(lowStock.length)} />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-rymx-cream text-lg font-bold">{t("topProducts")}</h2>
        {topProducts.length === 0 ? (
          <p className="text-rymx-cream/50 font-mono text-sm">{t("noSales")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {topProducts.map(([title, quantity]) => (
              <li key={title} className="text-rymx-cream/80 flex justify-between font-mono text-sm">
                <span>{title}</span>
                <span>{t("sold", { count: quantity })}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
