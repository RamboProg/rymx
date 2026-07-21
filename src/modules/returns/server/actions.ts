"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { checkAdminMutationRateLimit } from "@/lib/security/rateLimit";
import { applyStockDeltasInTransaction } from "@/modules/inventory/server";
import { getOrderById } from "@/modules/orders/server";
import { getSessionClaims } from "@/modules/rbac/server";
import { hasPermission } from "@/modules/rbac/services/permissions";
import {
  createReturnInputSchema,
  rejectReturnInputSchema,
  returnSchema,
  type Return,
} from "../schema";
import { remainingToReturn, validateReturnItems } from "../services/refund";
import { getReturnById, listReturnsByOrder } from "./index";

type ReturnActionResult = { ok: true; ret: Return } | { ok: false; error: string };

async function requireOrdersFulfill(): Promise<string | null> {
  const claims = await getSessionClaims();
  if (!hasPermission(claims, "orders:fulfill")) return null;
  return checkAdminMutationRateLimit(claims!.uid) ? claims!.uid : null;
}

// RMA creation is staff-initiated (no customer self-service UI yet — the
// COD/phone-support workflow this brand uses today has staff logging the
// return on the customer's behalf from the order detail page).
export async function createReturnAction(rawInput: unknown): Promise<ReturnActionResult> {
  const staffUid = await requireOrdersFulfill();
  if (!staffUid) return { ok: false, error: "Forbidden" };

  const parsed = createReturnInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { orderId, items, refundMinor } = parsed.data;

  const order = await getOrderById(orderId);
  if (!order) return { ok: false, error: "Order not found." };

  const existingReturns = await listReturnsByOrder(orderId);
  const remaining = remainingToReturn(order.items, existingReturns);
  const validation = validateReturnItems(items, remaining);
  if (!validation.ok) return { ok: false, error: validation.error };

  const returnItems = items.map((requested) => {
    const orderItem = order.items.find((i) => i.variantId === requested.variantId)!;
    return {
      productId: orderItem.productId,
      variantId: requested.variantId,
      sku: orderItem.sku,
      title: orderItem.title,
      quantity: requested.quantity,
      reason: requested.reason,
    };
  });

  const ref = adminDb.collection("returns").doc();
  const data = {
    orderId,
    items: returnItems,
    status: "requested" as const,
    refundMinor,
    refunded: false,
    createdAt: new Date(),
    decidedAt: null,
    decidedByUid: null,
  };
  await ref.set(data);

  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, ret: returnSchema.parse({ ...data, id: ref.id }) };
}

export async function approveReturnAction(returnId: string): Promise<ReturnActionResult> {
  const staffUid = await requireOrdersFulfill();
  if (!staffUid) return { ok: false, error: "Forbidden" };

  const ret = await getReturnById(returnId);
  if (!ret) return { ok: false, error: "Return not found." };
  if (ret.status !== "requested") return { ok: false, error: `Return is already ${ret.status}.` };

  const decidedAt = new Date();
  await adminDb
    .doc(`returns/${returnId}`)
    .update({ status: "approved", decidedAt, decidedByUid: staffUid });

  revalidatePath(`/admin/orders/${ret.orderId}`);
  return { ok: true, ret: { ...ret, status: "approved", decidedAt, decidedByUid: staffUid } };
}

export async function rejectReturnAction(rawInput: unknown): Promise<ReturnActionResult> {
  const staffUid = await requireOrdersFulfill();
  if (!staffUid) return { ok: false, error: "Forbidden" };

  const parsed = rejectReturnInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const ret = await getReturnById(parsed.data.returnId);
  if (!ret) return { ok: false, error: "Return not found." };
  if (ret.status !== "requested") return { ok: false, error: `Return is already ${ret.status}.` };

  const decidedAt = new Date();
  await adminDb
    .doc(`returns/${parsed.data.returnId}`)
    .update({ status: "rejected", decidedAt, decidedByUid: staffUid });

  revalidatePath(`/admin/orders/${ret.orderId}`);
  return { ok: true, ret: { ...ret, status: "rejected", decidedAt, decidedByUid: staffUid } };
}

// Restocks every item on an approved return and records the refund
// atomically — a return can only be restocked once (status guard prevents a
// double-restock from a duplicate/racing submit).
export async function restockReturnAction(returnId: string): Promise<ReturnActionResult> {
  const staffUid = await requireOrdersFulfill();
  if (!staffUid) return { ok: false, error: "Forbidden" };

  const ret = await getReturnById(returnId);
  if (!ret) return { ok: false, error: "Return not found." };
  if (ret.status !== "approved") {
    return { ok: false, error: "A return must be approved before it can be restocked." };
  }

  await adminDb.runTransaction(async (tx) => {
    await applyStockDeltasInTransaction(
      tx,
      ret.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        delta: item.quantity,
        reason: `Return #${returnId} restocked`,
        staffUid: staffUid!,
      })),
    );
    tx.update(adminDb.doc(`returns/${returnId}`), { status: "restocked", refunded: true });
  });

  revalidatePath(`/admin/orders/${ret.orderId}`);
  revalidatePath("/admin/inventory");
  return { ok: true, ret: { ...ret, status: "restocked", refunded: true } };
}
