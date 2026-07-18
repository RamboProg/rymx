import "server-only";

import type { DocumentData } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { orderSchema, type Order } from "../schema";

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value as string);
}

function parseOrder(id: string, data: DocumentData): Order {
  return orderSchema.parse({ ...data, id, createdAt: toDate(data.createdAt) });
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
