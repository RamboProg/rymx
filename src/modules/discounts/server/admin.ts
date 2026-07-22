import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { toDate } from "@/lib/firebase/toDate";
import { discountSchema, type Discount } from "../schema";
import { discountRef } from "./index";

// Admin-scale: every discount, unsorted — fine while the code list is small
// (same MVP-scale tradeoff as catalog/orders admin listings).
export async function listAllDiscounts(): Promise<Discount[]> {
  const snap = await adminDb.collection("discounts").get();
  return snap.docs.map((d) =>
    discountSchema.parse({
      ...d.data(),
      code: d.id,
      startsAt: toDate(d.data().startsAt),
      endsAt: toDate(d.data().endsAt),
    }),
  );
}

export async function listAllDiscountCodes(): Promise<Set<string>> {
  const snap = await adminDb.collection("discounts").select().get();
  return new Set(snap.docs.map((d) => d.id));
}

export async function createDiscountDoc(discount: Discount): Promise<void> {
  const ref = discountRef(discount.code);
  const existing = await ref.get();
  if (existing.exists) throw new Error("A discount with this code already exists.");
  await ref.set({
    type: discount.type,
    value: discount.value,
    minSpendMinor: discount.minSpendMinor,
    startsAt: discount.startsAt,
    endsAt: discount.endsAt,
    usageLimit: discount.usageLimit,
    redeemedCount: discount.redeemedCount,
    perUserLimit: discount.perUserLimit,
    productIds: discount.productIds,
    collectionIds: discount.collectionIds,
    active: discount.active,
    assignedToUid: discount.assignedToUid,
  });
}

export async function updateDiscountDoc(
  code: string,
  data: Partial<Omit<Discount, "code">>,
): Promise<void> {
  await discountRef(code).update(data);
}
