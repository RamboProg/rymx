import "server-only";

import type { DocumentData, DocumentReference, Transaction } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getCollectionsByIds } from "@/modules/collections/server";
import {
  discountRedemptionId,
  discountSchema,
  normalizeDiscountCode,
  type Discount,
} from "../schema";

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function parseDiscount(code: string, data: DocumentData): Discount {
  return discountSchema.parse({
    ...data,
    code,
    startsAt: toDate(data.startsAt),
    endsAt: toDate(data.endsAt),
  });
}

export function discountRef(code: string): DocumentReference {
  return adminDb.doc(`discounts/${normalizeDiscountCode(code)}`);
}

export function redemptionRef(code: string, identity: string): DocumentReference {
  return adminDb.doc(`discountRedemptions/${discountRedemptionId(code, identity)}`);
}

export async function getDiscountByCode(code: string): Promise<Discount | null> {
  const doc = await discountRef(code).get();
  if (!doc.exists) return null;
  return parseDiscount(doc.id, doc.data()!);
}

// Personal codes issued to a specific customer, for display on /account.
export async function listDiscountsForUid(uid: string): Promise<Discount[]> {
  const snap = await adminDb
    .collection("discounts")
    .where("assignedToUid", "==", uid)
    .where("active", "==", true)
    .get();
  return snap.docs.map((d) => parseDiscount(d.id, d.data()));
}

// Reads inside an already-open transaction so checkout re-validates the
// authoritative doc atomically with the rest of the order write.
export async function getDiscountInTransaction(
  tx: Transaction,
  code: string,
): Promise<Discount | null> {
  const snap = await tx.get(discountRef(code));
  if (!snap.exists) return null;
  return parseDiscount(snap.id, snap.data()!);
}

export async function getRedemptionCount(code: string, identity: string): Promise<number> {
  const doc = await redemptionRef(code, identity).get();
  if (!doc.exists) return 0;
  return (doc.data()?.count as number | undefined) ?? 0;
}

export async function getRedemptionCountInTransaction(
  tx: Transaction,
  code: string,
  identity: string,
): Promise<number> {
  const snap = await tx.get(redemptionRef(code, identity));
  if (!snap.exists) return 0;
  return (snap.data()?.count as number | undefined) ?? 0;
}

// Union of productIds across a discount's scoped collections, for cart
// applicability checks. Empty when the discount isn't collection-scoped.
export async function resolveCollectionProductIds(
  collectionIds: readonly string[],
): Promise<Set<string>> {
  const collections = await getCollectionsByIds(collectionIds);
  return new Set(collections.flatMap((c) => c.productIds));
}
