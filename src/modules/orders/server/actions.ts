"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { applyStockDeltasInTransaction } from "@/modules/inventory/server";
import { sendOrderConfirmationEmail } from "@/modules/notifications/server";
import { getSessionClaims } from "@/modules/rbac/server";
import { hasPermission } from "@/modules/rbac/services/permissions";
import { addOrderNoteInputSchema, type Order } from "../schema";
import { getOrderById, listOrderNotes } from "./index";

type OrderActionResult = { ok: true; order: Order } | { ok: false; error: string };
type VoidActionResult = { ok: true } | { ok: false; error: string };

async function requireOrdersFulfill(): Promise<string | null> {
  const claims = await getSessionClaims();
  return hasPermission(claims, "orders:fulfill") ? claims!.uid : null;
}

export async function confirmOrderAction(orderId: string): Promise<OrderActionResult> {
  const staffUid = await requireOrdersFulfill();
  if (!staffUid) return { ok: false, error: "Forbidden" };

  const order = await getOrderById(orderId);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "pending") {
    return { ok: false, error: `Order is already ${order.status}.` };
  }

  await adminDb.doc(`orders/${orderId}`).update({ status: "confirmed" });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true, order: { ...order, status: "confirmed" } };
}

export async function cancelOrderAction(orderId: string): Promise<OrderActionResult> {
  const staffUid = await requireOrdersFulfill();
  if (!staffUid) return { ok: false, error: "Forbidden" };

  const order = await getOrderById(orderId);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "pending" && order.status !== "confirmed") {
    return { ok: false, error: `Order is already ${order.status} and can no longer be cancelled.` };
  }

  await adminDb.runTransaction(async (tx) => {
    await applyStockDeltasInTransaction(
      tx,
      order.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        delta: item.quantity,
        reason: `Order #${orderId} cancelled`,
        staffUid,
      })),
    );
    tx.update(adminDb.doc(`orders/${orderId}`), { status: "cancelled" });
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");
  return { ok: true, order: { ...order, status: "cancelled" } };
}

export async function resendConfirmationAction(orderId: string): Promise<VoidActionResult> {
  const staffUid = await requireOrdersFulfill();
  if (!staffUid) return { ok: false, error: "Forbidden" };

  const order = await getOrderById(orderId);
  if (!order) return { ok: false, error: "Order not found." };
  if (!order.email) return { ok: false, error: "This order has no email on file." };

  await sendOrderConfirmationEmail(order);
  return { ok: true };
}

export type OrderNotesResult =
  { ok: true; notes: Awaited<ReturnType<typeof listOrderNotes>> } | { ok: false; error: string };

export async function addOrderNoteAction(rawInput: unknown): Promise<OrderNotesResult> {
  const staffUid = await requireOrdersFulfill();
  if (!staffUid) return { ok: false, error: "Forbidden" };

  const parsed = addOrderNoteInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await adminDb.collection(`orders/${parsed.data.orderId}/notes`).add({
    body: parsed.data.body,
    staffUid,
    createdAt: new Date(),
  });

  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  return { ok: true, notes: await listOrderNotes(parsed.data.orderId) };
}
