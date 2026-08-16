import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { Table, Td, Th } from "@/components/admin/Table";
import { formatEGP } from "@/lib/money";
import { listAllOrders } from "@/modules/orders/server";
import type { OrderStatus } from "@/modules/orders/schema";

export const metadata: Metadata = { title: "Orders — Admin — RYMX" };

const STATUS_FILTERS: (OrderStatus | "all")[] = [
  "all",
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status: rawStatus, q } = await searchParams;
  const status = STATUS_FILTERS.includes(rawStatus as OrderStatus)
    ? (rawStatus as OrderStatus)
    : "all";

  const [allOrders, t, tOrdersAdmin, tStatus, locale] = await Promise.all([
    listAllOrders(),
    getTranslations("pages.orders"),
    getTranslations("ordersAdmin"),
    getTranslations("orderStatus"),
    getLocale(),
  ]);
  const filtered = allOrders
    .filter((order) => status === "all" || order.status === status)
    .filter((order) => {
      if (!q) return true;
      const needle = q.trim().toLowerCase();
      return (
        order.id.toLowerCase().includes(needle) ||
        (order.email?.toLowerCase().includes(needle) ?? false) ||
        order.shipping.fullName.toLowerCase().includes(needle)
      );
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-rymx-cream text-2xl font-bold">{t("title")}</h1>
        <p className="text-rymx-cream/50 font-sans text-sm">{t("description")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <Link
              key={s}
              href={s === "all" ? "/admin/orders" : `/admin/orders?status=${s}`}
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
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder={tOrdersAdmin("searchPlaceholder")}
            className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-2 text-sm outline-none"
          />
        </form>
      </div>

      {filtered.length === 0 ? (
        <p className="text-rymx-cream/50 font-mono text-sm">{tOrdersAdmin("noOrdersMatch")}</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{tOrdersAdmin("colOrder")}</Th>
              <Th>{tOrdersAdmin("colCustomer")}</Th>
              <Th>{tOrdersAdmin("colStatus")}</Th>
              <Th>{tOrdersAdmin("colTotal")}</Th>
              <Th>{tOrdersAdmin("colPlaced")}</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr key={order.id}>
                <Td>
                  <Link href={`/admin/orders/${order.id}`} className="hover:text-rymx-gold">
                    #{order.id.slice(0, 8)}
                  </Link>
                </Td>
                <Td>
                  {order.shipping.fullName}
                  {order.email ? ` — ${order.email}` : ""}
                </Td>
                <Td>{tStatus(order.status)}</Td>
                <Td>{formatEGP(order.totalMinor)}</Td>
                <Td>{order.createdAt.toLocaleDateString(locale)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
