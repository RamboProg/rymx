import "server-only";

import type { DocumentData, Transaction } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { toDateFallback } from "@/lib/firebase/toDate";
import { listAllProducts } from "@/modules/catalog/server/admin";
import {
  LOW_STOCK_THRESHOLD,
  stockAdjustmentSchema,
  type StockAdjustment,
  type VariantStockRow,
} from "../schema";
import { computeAdjustedStock } from "../services/adjustment";

function parseAdjustment(id: string, data: DocumentData): StockAdjustment {
  return stockAdjustmentSchema.parse({ ...data, id, createdAt: toDateFallback(data.createdAt) });
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
          category: product.category,
          variantId: d.id,
          sku: data.sku as string,
          optionValues: (data.optionValues as Record<string, string>) ?? {},
          stock: data.stock as number,
          priceMinor: data.priceMinor as number,
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

// Shared by every code path that needs to move stock atomically with an
// audit trail entry inside an already-open transaction: manual admin
// adjustments, order cancellation (restock), and return processing
// (restock). Reads must happen before any of the transaction's other writes.
export async function applyStockDeltaInTransaction(
  tx: Transaction,
  params: { productId: string; variantId: string; delta: number; reason: string; staffUid: string },
): Promise<number> {
  const productRef = adminDb.doc(`products/${params.productId}`);
  const variantRef = adminDb.doc(`products/${params.productId}/variants/${params.variantId}`);
  const [productSnap, variantSnap] = await Promise.all([tx.get(productRef), tx.get(variantRef)]);
  if (!productSnap.exists || !variantSnap.exists) throw new Error("Variant not found.");

  const currentStock = variantSnap.data()!.stock as number;
  const adjusted = computeAdjustedStock(currentStock, params.delta);
  if (!adjusted.ok) throw new Error(adjusted.error);

  tx.update(variantRef, { stock: adjusted.newStock });
  tx.set(adminDb.collection("inventoryAdjustments").doc(), {
    productId: params.productId,
    productTitle: productSnap.data()!.title as string,
    variantId: params.variantId,
    sku: variantSnap.data()!.sku as string,
    delta: params.delta,
    newStock: adjusted.newStock,
    reason: params.reason,
    staffUid: params.staffUid,
    createdAt: new Date(),
  });
  return adjusted.newStock;
}

// Same as applyStockDeltaInTransaction but for N items in one transaction
// (order cancellation restock, return restock). Firestore transactions
// require every read to complete before any write is issued, so a plain loop
// calling applyStockDeltaInTransaction per item would throw on the second
// item's read (it'd follow the first item's writes) — this reads every
// variant up front with Promise.all, then issues all writes only after every
// read (and the stock-floor validation) has succeeded.
export async function applyStockDeltasInTransaction(
  tx: Transaction,
  adjustments: readonly {
    productId: string;
    variantId: string;
    delta: number;
    reason: string;
    staffUid: string;
  }[],
): Promise<number[]> {
  const reads = await Promise.all(
    adjustments.map(async (params) => {
      const productRef = adminDb.doc(`products/${params.productId}`);
      const variantRef = adminDb.doc(`products/${params.productId}/variants/${params.variantId}`);
      const [productSnap, variantSnap] = await Promise.all([
        tx.get(productRef),
        tx.get(variantRef),
      ]);
      if (!productSnap.exists || !variantSnap.exists) throw new Error("Variant not found.");

      const currentStock = variantSnap.data()!.stock as number;
      const adjusted = computeAdjustedStock(currentStock, params.delta);
      if (!adjusted.ok) throw new Error(adjusted.error);

      return {
        params,
        productRef,
        variantRef,
        productSnap,
        variantSnap,
        newStock: adjusted.newStock,
      };
    }),
  );

  for (const { params, variantRef, productSnap, variantSnap, newStock } of reads) {
    tx.update(variantRef, { stock: newStock });
    tx.set(adminDb.collection("inventoryAdjustments").doc(), {
      productId: params.productId,
      productTitle: productSnap.data()!.title as string,
      variantId: params.variantId,
      sku: variantSnap.data()!.sku as string,
      delta: params.delta,
      newStock,
      reason: params.reason,
      staffUid: params.staffUid,
      createdAt: new Date(),
    });
  }

  return reads.map((r) => r.newStock);
}
