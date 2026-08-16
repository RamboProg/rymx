import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { DocumentData } from "firebase-admin/firestore";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { adminDb } from "@/lib/firebase/admin";
import { toDateFallback } from "@/lib/firebase/toDate";
import { orderNoteSchema, orderSchema, type Order, type OrderNote } from "../schema";

function parseOrder(id: string, data: DocumentData): Order {
  return orderSchema.parse({ ...data, id, createdAt: toDateFallback(data.createdAt) });
}

type CachedOrder = Omit<Order, "createdAt"> & { createdAt: string };

function dehydrateOrder(o: Order): CachedOrder {
  return { ...o, createdAt: o.createdAt.toISOString() };
}

function hydrateOrder(o: CachedOrder): Order {
  return { ...o, createdAt: new Date(o.createdAt) };
}

export async function listOrderNotes(orderId: string): Promise<OrderNote[]> {
  const snap = await adminDb
    .collection(`orders/${orderId}/notes`)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((d) =>
    orderNoteSchema.parse({
      ...d.data(),
      id: d.id,
      createdAt: toDateFallback(d.data().createdAt),
    }),
  );
}

// Same MVP-scale simplification as catalog's listShopProducts: a single
// equality query (no composite index needed) + in-memory sort. A customer's
// own order history is small; revisit if that stops being true.
// Per-user — left uncached (private + must stay fresh after checkout).
export async function listOrdersByUid(uid: string): Promise<Order[]> {
  const snap = await adminDb.collection("orders").where("uid", "==", uid).get();
  return snap.docs
    .map((d) => parseOrder(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const doc = await adminDb.doc(`orders/${orderId}`).get();
  if (!doc.exists) return null;
  return parseOrder(doc.id, doc.data()!);
}

const getCachedAllOrders = unstable_cache(
  async (): Promise<CachedOrder[]> => {
    const snap = await adminDb.collection("orders").get();
    return snap.docs.map((d) => dehydrateOrder(parseOrder(d.id, d.data())));
  },
  ["orders-all"],
  { revalidate: 30, tags: [CACHE_TAGS.orders] },
);

// Admin/dashboard/analytics: every order. Short TTL + tag invalidation on
// checkout and status changes.
export const listAllOrders = cache(async (): Promise<Order[]> => {
  return (await getCachedAllOrders()).map(hydrateOrder);
});
