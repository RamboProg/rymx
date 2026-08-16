"use server";

import { revalidatePath } from "next/cache";
import { CACHE_TAGS, invalidateCacheTags } from "@/lib/cache/tags";
import { adminDb } from "@/lib/firebase/admin";
import { applyStockDeltasInTransaction } from "@/modules/inventory/server";
import { getOrderById } from "@/modules/orders/server";
import { getSessionClaims, requireAdminPermission } from "@/modules/rbac/server";
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
  return (await requireAdminPermission("orders:fulfill"))?.uid ?? null;
}

// Staff-initiated RMA creation — logging a return on the customer's behalf
// from the order detail page. See requestReturnAction below for the
// customer-initiated counterpart.
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
      reasonCategory: requested.reasonCategory,
      reasonDetail: requested.reasonDetail,
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

// Customer self-service counterpart to createReturnAction above — gated by
// order ownership (not the staff-only orders:fulfill permission), mirroring
// the IDOR check in src/app/account/orders/[id]/page.tsx. Reuses the exact
// same eligibility logic (remainingToReturn/validateReturnItems) so a
// customer can never request more than what's genuinely still returnable.
export async function requestReturnAction(rawInput: unknown): Promise<ReturnActionResult> {
  const claims = await getSessionClaims();
  if (!claims) return { ok: false, error: "Sign in required" };

  const parsed = createReturnInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { orderId, items } = parsed.data;

  const order = await getOrderById(orderId);
  // Same message for "missing" and "not yours" — don't leak whether an order
  // ID belonging to someone else exists.
  if (!order || order.uid !== claims.uid) return { ok: false, error: "Order not found." };
  if (order.status !== "delivered") {
    return { ok: false, error: "Only delivered orders are eligible for a return." };
  }

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
      reasonCategory: requested.reasonCategory,
      reasonDetail: requested.reasonDetail,
    };
  });

  const ref = adminDb.collection("returns").doc();
  const data = {
    orderId,
    items: returnItems,
    status: "requested" as const,
    // A customer never sets their own refund amount — staff sets/confirms it
    // at approval time (see approveReturnAction's refundMinor override
    // below). Ignoring rawInput's refundMinor entirely here, not just
    // defaulting the form to 0, so this can't be spoofed by calling the
    // action directly with a nonzero value.
    refundMinor: 0,
    refunded: false,
    createdAt: new Date(),
    decidedAt: null,
    decidedByUid: null,
  };
  await ref.set(data);

  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, ret: returnSchema.parse({ ...data, id: ref.id }) };
}

// refundMinor: optional staff override, set/confirmed at approval time.
// Defaults to the return's existing refundMinor when omitted, so the
// staff-created-return flow (which already sets a sensible amount at
// creation time) doesn't regress. Closes the gap where a customer-initiated
// return always starts at refundMinor: 0 and would otherwise stay 0 forever.
export async function approveReturnAction(
  returnId: string,
  refundMinor?: number,
): Promise<ReturnActionResult> {
  const staffUid = await requireOrdersFulfill();
  if (!staffUid) return { ok: false, error: "Forbidden" };

  const ret = await getReturnById(returnId);
  if (!ret) return { ok: false, error: "Return not found." };
  if (ret.status !== "requested") return { ok: false, error: `Return is already ${ret.status}.` };

  const resolvedRefundMinor = refundMinor ?? ret.refundMinor;
  const decidedAt = new Date();
  await adminDb.doc(`returns/${returnId}`).update({
    status: "approved",
    refundMinor: resolvedRefundMinor,
    decidedAt,
    decidedByUid: staffUid,
  });

  revalidatePath(`/admin/orders/${ret.orderId}`);
  return {
    ok: true,
    ret: {
      ...ret,
      status: "approved",
      refundMinor: resolvedRefundMinor,
      decidedAt,
      decidedByUid: staffUid,
    },
  };
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
  invalidateCacheTags(CACHE_TAGS.inventory, CACHE_TAGS.products, CACHE_TAGS.orders);
  return { ok: true, ret: { ...ret, status: "restocked", refunded: true } };
}
