import "server-only";

import { listAllCollectionsAdmin } from "@/modules/collections/server/admin";
import { listAllDiscounts } from "@/modules/discounts/server/admin";
import { listVariantsAcrossProducts } from "@/modules/inventory/server";
import { listAllOrders } from "@/modules/orders/server";
import { listAllReturns } from "@/modules/returns/server";
import type {
  DailySales,
  DiscountPerformance,
  MostReturnedItem,
  ReturnReasonCount,
  TopCollection,
  TopProduct,
} from "../schema";
import {
  aggregateDailySales,
  aggregateDiscountPerformance,
  aggregateMostReturnedItems,
  aggregateReturnReasons,
  aggregateTopCollections,
  aggregateTopProducts,
} from "../services/aggregate";

// Same cutoff pattern aggregateDailySales already uses (start-of-day, days-1
// back) so "last N days" means the same thing across every trending report.
function daysAgo(days: number): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (days - 1));
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
}

export async function getSalesReport(days = 30): Promise<DailySales[]> {
  const orders = await listAllOrders();
  return aggregateDailySales(orders, days);
}

export async function getTopProductsReport(limit = 10): Promise<TopProduct[]> {
  const orders = await listAllOrders();
  return aggregateTopProducts(orders, limit);
}

export async function getTrendingProductsReport(limit = 10, days = 30): Promise<TopProduct[]> {
  const orders = await listAllOrders();
  return aggregateTopProducts(orders, limit, daysAgo(days));
}

export async function getTrendingCollectionsReport(
  limit = 10,
  days = 30,
): Promise<TopCollection[]> {
  const [orders, collections] = await Promise.all([listAllOrders(), listAllCollectionsAdmin()]);
  return aggregateTopCollections(orders, collections, limit, daysAgo(days));
}

export async function getMostReturnedItemsReport(limit = 10): Promise<MostReturnedItem[]> {
  const returns = await listAllReturns();
  return aggregateMostReturnedItems(returns, limit);
}

export async function getReturnReasonsReport(): Promise<ReturnReasonCount[]> {
  const returns = await listAllReturns();
  return aggregateReturnReasons(returns);
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
