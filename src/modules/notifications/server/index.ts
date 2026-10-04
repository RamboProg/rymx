import "server-only";

import { formatEGP } from "@/lib/money";
import { getSiteUrl } from "@/lib/siteUrl";
import { getProductById } from "@/modules/catalog/server";
import type { Order } from "@/modules/orders/schema";
import { listStaffUsers } from "@/modules/rbac/server/admin";
import { hasPermission } from "@/modules/rbac/services/permissions";
import type { Shipment } from "@/modules/shipments/schema";
import { getEmailTemplates, getStoreSettings } from "@/modules/settings/server";
import { sendEmail } from "./email";
import { renderEmailShell } from "./emailTemplate";

function itemRows(order: Order): string {
  return order.items
    .map(
      (item) =>
        `<li style="margin-bottom:4px;">${item.title} × ${item.quantity} — ${formatEGP(item.unitPriceMinor * item.quantity)}</li>`,
    )
    .join("");
}

// Order items don't snapshot an image, so look up each product's first media
// asset at send time. A failed lookup (product deleted, bad doc) just drops
// that thumbnail — it must never block the notification itself.
async function getItemImageUrls(order: Order): Promise<Map<string, string>> {
  const productIds = [...new Set(order.items.map((item) => item.productId))];
  const entries = await Promise.all(
    productIds.map(async (productId): Promise<[string, string] | null> => {
      try {
        const url = (await getProductById(productId))?.media[0]?.url;
        if (!url) return null;
        return [productId, url.startsWith("/") ? `${getSiteUrl()}${url}` : url];
      } catch (err) {
        console.error(`[notifications] Couldn't load image for product ${productId}`, err);
        return null;
      }
    }),
  );
  return new Map(entries.filter((entry) => entry !== null));
}

// Table layout (not flex/grid) so the thumbnail sits beside the text in every
// mail client.
function itemRowsWithImages(order: Order, imageUrls: Map<string, string>): string {
  const rows = order.items
    .map((item) => {
      const imageUrl = imageUrls.get(item.productId);
      const options = Object.entries(item.optionValues)
        .map(([name, value]) => `${name}: ${value}`)
        .join(", ");
      const imageCell = imageUrl
        ? `<img src="${imageUrl}" alt="${item.title}" width="80" height="80" style="display:block;width:80px;height:80px;object-fit:cover;border-radius:6px;" />`
        : "";
      return `<tr><td style="padding:8px 12px 8px 0;width:80px;vertical-align:top;">${imageCell}</td><td style="padding:8px 0;vertical-align:top;"><strong>${item.title}</strong>${options ? `<br /><span style="font-size:0.9em;opacity:0.8;">${options}</span>` : ""}<br />SKU: ${item.sku}<br />× ${item.quantity} — ${formatEGP(item.unitPriceMinor * item.quantity)}</td></tr>`;
    })
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse;">${rows}</table>`;
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
    html: renderEmailShell({
      title: "Your Promo Code",
      bodyHtml: `<p>${intro}</p><p style="font-size:1.5em;font-weight:bold;color:#e8c170;">${params.code}</p><p>${params.description}</p>`,
    }),
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
    html: renderEmailShell({
      title: "Admin Invitation",
      bodyHtml: `<p>You've been added as <strong>${params.role}</strong> on the ${storeName} admin.</p><p>Temporary password: <strong>${params.tempPassword}</strong></p><p>Sign in and reset your password as soon as possible.</p>`,
    }),
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
    html: renderEmailShell({
      title: "Order Received",
      bodyHtml: `<p>${intro}</p><ul style="padding-left:20px;margin:16px 0;">${itemRows(order)}</ul><p>Total: ${formatEGP(order.totalMinor)}</p><p>Cash on delivery.</p><p>— ${storeName}</p>`,
    }),
  });
}

// Sent to every account that can actually fulfill orders (owner/admin, or
// anyone explicitly granted orders:fulfill) the moment a new order is
// placed — not just a single manually-configured address. Settings ->
// Store's supportEmail (if set) is included too, as an extra recipient (e.g.
// a shared inbox that isn't itself a staff login). Relying on supportEmail
// alone silently dropped every notification whenever nobody had ever saved
// the Store settings form — the doc doesn't exist until then, so
// getStoreSettings() defaults it to null.
export async function sendNewOrderAdminNotification(order: Order): Promise<void> {
  const [{ storeName, supportEmail }, staff, imageUrls] = await Promise.all([
    getStoreSettings(),
    listStaffUsers(),
    getItemImageUrls(order),
  ]);

  // Keyed by lowercased email to dedupe, valued by the original casing to
  // send with.
  const recipients = new Map<string, string>();
  if (supportEmail) recipients.set(supportEmail.toLowerCase(), supportEmail);
  for (const member of staff) {
    if (!member.email) continue;
    if (!hasPermission({ role: member.role, permissions: member.permissions }, "orders:fulfill"))
      continue;
    recipients.set(member.email.toLowerCase(), member.email);
  }
  if (recipients.size === 0) return;

  const html = renderEmailShell({
    title: "New Order",
    bodyHtml: `<p>New order from ${order.shipping.fullName} (${order.email ?? "guest, no email"}).</p>${itemRowsWithImages(order, imageUrls)}<p>Total: ${formatEGP(order.totalMinor)}</p><p>Shipping to: ${order.shipping.addressLine}, ${order.shipping.city}, ${order.shipping.governorate}. Phone: ${order.shipping.phone}</p><p>— ${storeName} admin</p>`,
  });
  const subject = `New order received — #${order.id}`;

  await Promise.all([...recipients.values()].map((to) => sendEmail({ to, subject, html })));
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
    html: renderEmailShell({
      title: "Order Confirmed",
      bodyHtml: `<p>${intro}</p><p>— ${storeName}</p>`,
    }),
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
    html: renderEmailShell({
      title: "Order Shipped",
      bodyHtml: `<p>${intro}</p><p>Carrier: ${shipment.carrier}</p><p>Tracking number: ${shipment.trackingNumber}</p><p>— ${storeName}</p>`,
    }),
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
    html: renderEmailShell({
      title: "Order Delivered",
      bodyHtml: `<p>${intro}</p><p>— ${storeName}</p>`,
    }),
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
    html: renderEmailShell({
      title: "Order Cancelled",
      bodyHtml: `<p>${intro}</p><p>— ${storeName}</p>`,
    }),
  });
}
