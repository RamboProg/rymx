import "server-only";

import type { DocumentData } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { returnSchema, type Return } from "../schema";

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function parseReturn(id: string, data: DocumentData): Return {
  return returnSchema.parse({
    ...data,
    id,
    createdAt: toDate(data.createdAt),
    decidedAt: toDate(data.decidedAt),
  });
}

export async function listReturnsByOrder(orderId: string): Promise<Return[]> {
  const snap = await adminDb.collection("returns").where("orderId", "==", orderId).get();
  return snap.docs
    .map((d) => parseReturn(d.id, d.data()))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function getReturnById(returnId: string): Promise<Return | null> {
  const doc = await adminDb.doc(`returns/${returnId}`).get();
  if (!doc.exists) return null;
  return parseReturn(doc.id, doc.data()!);
}
