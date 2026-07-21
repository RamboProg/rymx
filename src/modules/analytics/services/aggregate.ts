import type { DailySales, DiscountPerformance, TopProduct } from "../schema";

type OrderLike = {
  createdAt: Date;
  status: string;
  totalMinor: number;
  discountMinor: number;
  discountCode: string | null;
  items: readonly { productId: string; title: string; quantity: number; unitPriceMinor: number }[];
};

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Cancelled orders never happened revenue-wise — excluded from every report
// below, matching the same convention used for customer lifetime value.
function isCounted(order: OrderLike): boolean {
  return order.status !== "cancelled";
}

export function aggregateDailySales(orders: readonly OrderLike[], days: number): DailySales[] {
  const now = new Date();
  const buckets = new Map<string, DailySales>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    buckets.set(key, { date: key, orderCount: 0, revenueMinor: 0 });
  }

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  cutoff.setHours(0, 0, 0, 0);

  for (const order of orders) {
    if (!isCounted(order) || order.createdAt < cutoff) continue;
    const key = dateKey(order.createdAt);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.orderCount += 1;
    bucket.revenueMinor += order.totalMinor;
  }

  return Array.from(buckets.values());
}

export function aggregateTopProducts(orders: readonly OrderLike[], limit: number): TopProduct[] {
  const byProduct = new Map<string, TopProduct>();
  for (const order of orders) {
    if (!isCounted(order)) continue;
    for (const item of order.items) {
      const existing = byProduct.get(item.productId) ?? {
        productId: item.productId,
        title: item.title,
        quantitySold: 0,
        revenueMinor: 0,
      };
      existing.quantitySold += item.quantity;
      existing.revenueMinor += item.unitPriceMinor * item.quantity;
      byProduct.set(item.productId, existing);
    }
  }
  return Array.from(byProduct.values())
    .sort((a, b) => b.revenueMinor - a.revenueMinor)
    .slice(0, limit);
}

export function aggregateDiscountPerformance(
  orders: readonly OrderLike[],
  discounts: readonly { code: string; redeemedCount: number }[],
): DiscountPerformance[] {
  const givenByCode = new Map<string, number>();
  for (const order of orders) {
    if (!isCounted(order) || !order.discountCode) continue;
    givenByCode.set(
      order.discountCode,
      (givenByCode.get(order.discountCode) ?? 0) + order.discountMinor,
    );
  }

  return discounts
    .map((d) => ({
      code: d.code,
      redeemedCount: d.redeemedCount,
      discountGivenMinor: givenByCode.get(d.code) ?? 0,
    }))
    .filter((d) => d.redeemedCount > 0)
    .sort((a, b) => b.discountGivenMinor - a.discountGivenMinor);
}
