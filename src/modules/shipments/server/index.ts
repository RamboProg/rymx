import "server-only";

import type { DocumentData } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { shipmentSchema, type Shipment } from "../schema";

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function parseShipment(id: string, data: DocumentData): Shipment {
  return shipmentSchema.parse({
    ...data,
    id,
    createdAt: toDate(data.createdAt),
    shippedAt: toDate(data.shippedAt),
    deliveredAt: toDate(data.deliveredAt),
  });
}

export async function listShipmentsByOrder(orderId: string): Promise<Shipment[]> {
  const snap = await adminDb.collection("shipments").where("orderId", "==", orderId).get();
  return snap.docs
    .map((d) => parseShipment(d.id, d.data()))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function getShipmentById(shipmentId: string): Promise<Shipment | null> {
  const doc = await adminDb.doc(`shipments/${shipmentId}`).get();
  if (!doc.exists) return null;
  return parseShipment(doc.id, doc.data()!);
}
