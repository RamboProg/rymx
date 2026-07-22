import type {
  DailySales,
  DiscountPerformance,
  MostReturnedItem,
  ReturnReasonCount,
  TopCollection,
  TopProduct,
} from "../schema";

type OrderLike = {
  createdAt: Date;
  status: string;
  totalMinor: number;
  discountMinor: number;
  discountCode: string | null;
  items: readonly { productId: string; title: string; quantity: number; unitPriceMinor: number }[];
};

type ReturnLike = {
  items: readonly {
    productId: string;
    title: string;
    quantity: number;
    reasonCategory: string;
  }[];
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

export function aggregateTopProducts(
  orders: readonly OrderLike[],
  limit: number,
  since?: Date,
): TopProduct[] {
  const byProduct = new Map<string, TopProduct>();
  for (const order of orders) {
    if (!isCounted(order)) continue;
    if (since && order.createdAt < since) continue;
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

// Attributes each order line item's quantity/revenue to every collection its
// product belongs to (a product can live in more than one collection, so a
// single line item can count toward multiple rows here).
export function aggregateTopCollections(
  orders: readonly OrderLike[],
  collections: readonly { id: string; title: string; productIds: readonly string[] }[],
  limit: number,
  since?: Date,
): TopCollection[] {
  const collectionIdsByProduct = new Map<string, string[]>();
  const titleById = new Map<string, string>();
  for (const collection of collections) {
    titleById.set(collection.id, collection.title);
    for (const productId of collection.productIds) {
      const existing = collectionIdsByProduct.get(productId) ?? [];
      existing.push(collection.id);
      collectionIdsByProduct.set(productId, existing);
    }
  }

  const byCollection = new Map<string, TopCollection>();
  for (const order of orders) {
    if (!isCounted(order)) continue;
    if (since && order.createdAt < since) continue;
    for (const item of order.items) {
      const collectionIds = collectionIdsByProduct.get(item.productId) ?? [];
      for (const collectionId of collectionIds) {
        const existing = byCollection.get(collectionId) ?? {
          collectionId,
          title: titleById.get(collectionId) ?? collectionId,
          quantitySold: 0,
          revenueMinor: 0,
        };
        existing.quantitySold += item.quantity;
        existing.revenueMinor += item.unitPriceMinor * item.quantity;
        byCollection.set(collectionId, existing);
      }
    }
  }
  return Array.from(byCollection.values())
    .sort((a, b) => b.revenueMinor - a.revenueMinor)
    .slice(0, limit);
}

// Every return regardless of status counts here — a request itself is the
// operational signal this report exists to surface, whether or not staff
// later approved it (unlike orders, there's no "cancelled" analog to
// exclude).
export function aggregateMostReturnedItems(
  returns: readonly ReturnLike[],
  limit: number,
): MostReturnedItem[] {
  const byProduct = new Map<string, MostReturnedItem>();
  for (const ret of returns) {
    for (const item of ret.items) {
      const existing = byProduct.get(item.productId) ?? {
        productId: item.productId,
        title: item.title,
        quantityReturned: 0,
      };
      existing.quantityReturned += item.quantity;
      byProduct.set(item.productId, existing);
    }
  }
  return Array.from(byProduct.values())
    .sort((a, b) => b.quantityReturned - a.quantityReturned)
    .slice(0, limit);
}

// Same no-status-filter reasoning as aggregateMostReturnedItems. Weighted by
// returned quantity (not just line-item count) so a single line covering
// several units counts proportionally, matching how aggregateMostReturnedItems
// weighs by quantity too.
export function aggregateReturnReasons(returns: readonly ReturnLike[]): ReturnReasonCount[] {
  const counts = new Map<string, number>();
  for (const ret of returns) {
    for (const item of ret.items) {
      counts.set(item.reasonCategory, (counts.get(item.reasonCategory) ?? 0) + item.quantity);
    }
  }
  return Array.from(counts.entries())
    .map(([reasonCategory, count]) => ({ reasonCategory, count }))
    .sort((a, b) => b.count - a.count);
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
