import "server-only";

import type { DocumentData } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { listAllProducts } from "@/modules/catalog/server/admin";
import {
  LOW_STOCK_THRESHOLD,
  stockAdjustmentSchema,
  type StockAdjustment,
  type VariantStockRow,
} from "../schema";

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value as string);
}

function parseAdjustment(id: string, data: DocumentData): StockAdjustment {
  return stockAdjustmentSchema.parse({ ...data, id, createdAt: toDate(data.createdAt) });
}

// Joins every product's variants with its title, for the admin stock table.
// MVP-scale: loops per product rather than a collection-group query — fine
// while the catalog is small (same tradeoff as catalog's listShopProducts).
export async function listVariantsAcrossProducts(): Promise<VariantStockRow[]> {
  const products = await listAllProducts();
  const rows = await Promise.all(
    products.map(async (product) => {
      const snap = await adminDb.collection(`products/${product.id}/variants`).get();
      return snap.docs.map((d) => {
        const data = d.data();
        return {
          productId: product.id,
          productTitle: product.title,
          variantId: d.id,
          sku: data.sku as string,
          optionValues: (data.optionValues as Record<string, string>) ?? {},
          stock: data.stock as number,
        };
      });
    }),
  );
  return rows.flat();
}

export async function listLowStock(threshold = LOW_STOCK_THRESHOLD): Promise<VariantStockRow[]> {
  const all = await listVariantsAcrossProducts();
  return all.filter((row) => row.stock <= threshold);
}

export async function listAdjustments(limit = 50): Promise<StockAdjustment[]> {
  const snap = await adminDb
    .collection("inventoryAdjustments")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => parseAdjustment(d.id, d.data()));
}
