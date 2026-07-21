import "server-only";

import { listAllDiscounts } from "@/modules/discounts/server/admin";
import { listVariantsAcrossProducts } from "@/modules/inventory/server";
import { listAllOrders } from "@/modules/orders/server";
import type { DailySales, DiscountPerformance, TopProduct } from "../schema";
import {
  aggregateDailySales,
  aggregateDiscountPerformance,
  aggregateTopProducts,
} from "../services/aggregate";

export async function getSalesReport(days = 30): Promise<DailySales[]> {
  const orders = await listAllOrders();
  return aggregateDailySales(orders, days);
}

export async function getTopProductsReport(limit = 10): Promise<TopProduct[]> {
  const orders = await listAllOrders();
  return aggregateTopProducts(orders, limit);
}

export async function getDiscountPerformanceReport(): Promise<DiscountPerformance[]> {
  const [orders, discounts] = await Promise.all([listAllOrders(), listAllDiscounts()]);
  return aggregateDiscountPerformance(orders, discounts);
}

export async function getInventoryValueMinor(): Promise<number> {
  const rows = await listVariantsAcrossProducts();
  // Retail-value sum (stock × current price) — a simple, defensible reading
  // of "inventory report" without a separate cost-of-goods field anywhere
  // in the catalog model.
  return rows.reduce((sum, row) => sum + row.stock * row.priceMinor, 0);
}
