import "server-only";

import type { DocumentData } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { toDateFallback } from "@/lib/firebase/toDate";
import { orderNoteSchema, orderSchema, type Order, type OrderNote } from "../schema";

function parseOrder(id: string, data: DocumentData): Order {
  return orderSchema.parse({ ...data, id, createdAt: toDateFallback(data.createdAt) });
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

// Admin-only, dashboard-scale: every order, unsorted. Fine for summing into
// KPI tiles at MVP scale; a full admin order list/detail UI is Phase 7.
export async function listAllOrders(): Promise<Order[]> {
  const snap = await adminDb.collection("orders").get();
  return snap.docs.map((d) => parseOrder(d.id, d.data()));
}
