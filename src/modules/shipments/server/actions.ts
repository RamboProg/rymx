"use server";

import { revalidatePath } from "next/cache";
import { CACHE_TAGS, invalidateCacheTags } from "@/lib/cache/tags";
import { adminDb } from "@/lib/firebase/admin";
import {
  sendOrderConfirmedEmail,
  sendOrderDeliveredEmail,
  sendOrderShippedEmail,
} from "@/modules/notifications/server";
import { getOrderById } from "@/modules/orders/server";
import { requireAdminPermission } from "@/modules/rbac/server";
import {
  createShipmentInputSchema,
  markShippedInputSchema,
  shipmentSchema,
  type Shipment,
  type ShipmentItem,
} from "../schema";
import {
  isOrderFullyDelivered,
  remainingToFulfill,
  validateShipmentItems,
} from "../services/fulfillment";
import { getShipmentById, listShipmentsByOrder } from "./index";

type ShipmentActionResult = { ok: true; shipment: Shipment } | { ok: false; error: string };

async function requireOrdersFulfill(): Promise<boolean> {
  return (await requireAdminPermission("orders:fulfill")) !== null;
}

export async function createShipmentAction(rawInput: unknown): Promise<ShipmentActionResult> {
  if (!(await requireOrdersFulfill())) return { ok: false, error: "Forbidden" };

  const parsed = createShipmentInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { orderId, items } = parsed.data;

  const order = await getOrderById(orderId);
  if (!order) return { ok: false, error: "Order not found." };

  const existingShipments = await listShipmentsByOrder(orderId);
  const remaining = remainingToFulfill(order.items, existingShipments);
  const validation = validateShipmentItems(items, remaining);
  if (!validation.ok) return { ok: false, error: validation.error };

  const shipmentItems: ShipmentItem[] = items.map((requested) => {
    const orderItem = order.items.find((i) => i.variantId === requested.variantId)!;
    return {
      variantId: requested.variantId,
      sku: orderItem.sku,
      title: orderItem.title,
      quantity: requested.quantity,
    };
  });

  const ref = adminDb.collection("shipments").doc();
  const data = {
    orderId,
    items: shipmentItems,
    carrier: null,
    trackingNumber: null,
    status: "pending" as const,
    createdAt: new Date(),
    shippedAt: null,
    deliveredAt: null,
  };
  await ref.set(data);

  if (order.status === "pending") {
    await adminDb.doc(`orders/${orderId}`).update({ status: "confirmed" });
    await sendOrderConfirmedEmail({ ...order, status: "confirmed" });
  }

  invalidateCacheTags(CACHE_TAGS.orders);
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, shipment: shipmentSchema.parse({ ...data, id: ref.id }) };
}

export async function markShippedAction(rawInput: unknown): Promise<ShipmentActionResult> {
  if (!(await requireOrdersFulfill())) return { ok: false, error: "Forbidden" };

  const parsed = markShippedInputSchema.safeParse(rawInput);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { shipmentId, carrier, trackingNumber } = parsed.data;

  const shipment = await getShipmentById(shipmentId);
  if (!shipment) return { ok: false, error: "Shipment not found." };
  if (shipment.status !== "pending")
    return { ok: false, error: `Shipment is already ${shipment.status}.` };

  const shippedAt = new Date();
  await adminDb
    .doc(`shipments/${shipmentId}`)
    .update({ status: "shipped", shippedAt, carrier, trackingNumber });

  const order = await getOrderById(shipment.orderId);
  if (order && (order.status === "pending" || order.status === "confirmed")) {
    await adminDb.doc(`orders/${shipment.orderId}`).update({ status: "shipped" });
  }

  const updatedShipment: Shipment = {
    ...shipment,
    status: "shipped",
    shippedAt,
    carrier,
    trackingNumber,
  };
  if (order) await sendOrderShippedEmail(order, updatedShipment);

  invalidateCacheTags(CACHE_TAGS.orders);
  revalidatePath(`/admin/orders/${shipment.orderId}`);
  return { ok: true, shipment: updatedShipment };
}

export async function markDeliveredAction(shipmentId: string): Promise<ShipmentActionResult> {
  if (!(await requireOrdersFulfill())) return { ok: false, error: "Forbidden" };

  const shipment = await getShipmentById(shipmentId);
  if (!shipment) return { ok: false, error: "Shipment not found." };
  if (shipment.status !== "shipped") {
    return { ok: false, error: "A shipment must be shipped before it can be marked delivered." };
  }

  const deliveredAt = new Date();
  await adminDb.doc(`shipments/${shipmentId}`).update({ status: "delivered", deliveredAt });
  const updatedShipment: Shipment = { ...shipment, status: "delivered", deliveredAt };

  const order = await getOrderById(shipment.orderId);
  if (order) {
    const allShipments = await listShipmentsByOrder(shipment.orderId);
    const withUpdate = allShipments.map((s) => (s.id === shipmentId ? updatedShipment : s));
    if (isOrderFullyDelivered(order.items, withUpdate)) {
      await adminDb.doc(`orders/${shipment.orderId}`).update({ status: "delivered" });
      await sendOrderDeliveredEmail({ ...order, status: "delivered" });
    }
  }

  invalidateCacheTags(CACHE_TAGS.orders);
  revalidatePath(`/admin/orders/${shipment.orderId}`);
  return { ok: true, shipment: updatedShipment };
}
