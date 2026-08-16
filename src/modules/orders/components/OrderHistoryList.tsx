import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { formatEGP } from "@/lib/money";
import type { Order } from "../schema";

export async function OrderHistoryList({ orders }: { orders: Order[] }) {
  const [t, locale] = await Promise.all([getTranslations("account"), getLocale()]);
  if (orders.length === 0) {
    return <p className="text-rymx-cream/50 font-mono text-sm">{t("noOrdersYet")}</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={`/account/orders/${order.id}`}
            className="border-rymx-cream/10 bg-rymx-card hover:border-rymx-gold flex items-center justify-between gap-4 rounded-md border p-4 transition-colors"
          >
            <div className="text-rymx-cream/70 font-mono text-xs">
              <p className="text-rymx-cream">{t("orderNumber", { id: order.id })}</p>
              <p>{order.createdAt.toLocaleDateString(locale)}</p>
            </div>
            <p className="text-rymx-gold font-mono text-sm">{formatEGP(order.totalMinor)}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
