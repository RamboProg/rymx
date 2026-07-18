import type { Metadata } from "next";
import { StatTile } from "@/components/admin/StatTile";
import { formatEGP } from "@/lib/money";
import { listAllProducts } from "@/modules/catalog/server/admin";
import { listLowStock } from "@/modules/inventory/server";
import { listAllOrders } from "@/modules/orders/server";

export const metadata: Metadata = { title: "Admin — RYMX" };

export default async function AdminDashboardPage() {
  const [products, orders, lowStock] = await Promise.all([
    listAllProducts(),
    listAllOrders(),
    listLowStock(),
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
      <h1 className="font-display text-rymx-cream text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Products" value={String(products.length)} />
        <StatTile label="Orders" value={String(orders.length)} />
        <StatTile label="Revenue" value={formatEGP(revenueMinor)} />
        <StatTile label="Low stock" value={String(lowStock.length)} />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-rymx-cream text-lg font-bold">Top products</h2>
        {topProducts.length === 0 ? (
          <p className="text-rymx-cream/50 font-mono text-sm">No sales yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {topProducts.map(([title, quantity]) => (
              <li key={title} className="text-rymx-cream/80 flex justify-between font-mono text-sm">
                <span>{title}</span>
                <span>{quantity} sold</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
