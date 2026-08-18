import "server-only";

import { formatEGP } from "@/lib/money";
import type { Order } from "@/modules/orders/schema";
import type { Shipment } from "@/modules/shipments/schema";
import { getEmailTemplates, getStoreSettings } from "@/modules/settings/server";
import { sendEmail } from "./email";

function itemRows(order: Order): string {
  return order.items
    .map(
      (item) =>
        `<li>${item.title} × ${item.quantity} — ${formatEGP(item.unitPriceMinor * item.quantity)}</li>`,
    )
    .join("");
}

export async function sendPromoCodeEmail(params: {
  to: string;
  code: string;
  description: string;
}): Promise<void> {
  const [{ storeName }, { promoCodeIntro }] = await Promise.all([
    getStoreSettings(),
    getEmailTemplates(),
  ]);
  const intro = promoCodeIntro || `Here's your personal ${storeName} promo code:`;

  await sendEmail({
    to: params.to,
    subject: `A promo code just for you — ${params.code}`,
    html: `<p>${intro}</p><p style="font-size:1.5em;font-weight:bold;">${params.code}</p><p>${params.description}</p>`,
  });
}

export async function sendStaffInviteEmail(params: {
  to: string;
  tempPassword: string;
  role: string;
}): Promise<void> {
  const { storeName } = await getStoreSettings();
  await sendEmail({
    to: params.to,
    subject: `You've been invited to the ${storeName} admin`,
    html: `<p>You've been added as <strong>${params.role}</strong> on the ${storeName} admin.</p><p>Temporary password: <strong>${params.tempPassword}</strong></p><p>Sign in and reset your password as soon as possible.</p>`,
  });
}

// Sent to the customer right after checkout — order placed, awaiting review.
export async function sendOrderConfirmationEmail(order: Order): Promise<void> {
  if (!order.email) return;

  const [{ storeName }, { orderConfirmationIntro }] = await Promise.all([
    getStoreSettings(),
    getEmailTemplates(),
  ]);
  const intro = orderConfirmationIntro || `Thanks for your order, ${order.shipping.fullName}.`;

  await sendEmail({
    to: order.email,
    subject: `Order confirmed — #${order.id}`,
    html: `<p>${intro}</p><ul>${itemRows(order)}</ul><p>Total: ${formatEGP(order.totalMinor)}</p><p>Cash on delivery.</p><p>— ${storeName}</p>`,
  });
}

// Sent to the store's supportEmail (Settings -> Store) the moment a new
// order is placed. Silently skipped if no supportEmail is configured — a
// missing admin address is a config gap, not a send failure.
export async function sendNewOrderAdminNotification(order: Order): Promise<void> {
  const { storeName, supportEmail } = await getStoreSettings();
  if (!supportEmail) return;

  await sendEmail({
    to: supportEmail,
    subject: `New order received — #${order.id}`,
    html: `<p>New order from ${order.shipping.fullName} (${order.email ?? "guest, no email"}).</p><ul>${itemRows(order)}</ul><p>Total: ${formatEGP(order.totalMinor)}</p><p>Shipping to: ${order.shipping.addressLine}, ${order.shipping.city}, ${order.shipping.governorate}. Phone: ${order.shipping.phone}</p><p>— ${storeName} admin</p>`,
  });
}

// Sent to the customer once staff review the order (manual confirmOrderAction,
// or automatically the moment the first shipment is created).
export async function sendOrderConfirmedEmail(order: Order): Promise<void> {
  if (!order.email) return;

  const [{ storeName }, { orderConfirmedIntro }] = await Promise.all([
    getStoreSettings(),
    getEmailTemplates(),
  ]);
  const intro =
    orderConfirmedIntro || `Your order #${order.id} has been confirmed and is being prepared.`;

  await sendEmail({
    to: order.email,
    subject: `Order confirmed — #${order.id}`,
    html: `<p>${intro}</p><p>— ${storeName}</p>`,
  });
}

// Sent when a shipment for the order is marked shipped (carrier + tracking
// number required at that point — see markShippedInputSchema).
export async function sendOrderShippedEmail(order: Order, shipment: Shipment): Promise<void> {
  if (!order.email) return;

  const [{ storeName }, { orderShippedIntro }] = await Promise.all([
    getStoreSettings(),
    getEmailTemplates(),
  ]);
  const intro = orderShippedIntro || `Your order #${order.id} is on its way.`;

  await sendEmail({
    to: order.email,
    subject: `Order shipped — #${order.id}`,
    html: `<p>${intro}</p><p>Carrier: ${shipment.carrier}</p><p>Tracking number: ${shipment.trackingNumber}</p><p>— ${storeName}</p>`,
  });
}

// Sent once every shipment for the order has been marked delivered.
export async function sendOrderDeliveredEmail(order: Order): Promise<void> {
  if (!order.email) return;

  const [{ storeName }, { orderDeliveredIntro }] = await Promise.all([
    getStoreSettings(),
    getEmailTemplates(),
  ]);
  const intro = orderDeliveredIntro || `Your order #${order.id} has been delivered. Enjoy!`;

  await sendEmail({
    to: order.email,
    subject: `Order delivered — #${order.id}`,
    html: `<p>${intro}</p><p>— ${storeName}</p>`,
  });
}

// Sent when staff cancel the order (cancelOrderAction).
export async function sendOrderCancelledEmail(order: Order): Promise<void> {
  if (!order.email) return;

  const [{ storeName }, { orderCancelledIntro }] = await Promise.all([
    getStoreSettings(),
    getEmailTemplates(),
  ]);
  const intro = orderCancelledIntro || `Your order #${order.id} has been cancelled.`;

  await sendEmail({
    to: order.email,
    subject: `Order cancelled — #${order.id}`,
    html: `<p>${intro}</p><p>— ${storeName}</p>`,
  });
}
