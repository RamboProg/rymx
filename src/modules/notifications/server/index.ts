import "server-only";

import { formatEGP } from "@/lib/money";
import type { Order } from "@/modules/orders/schema";
import { getEmailTemplates, getStoreSettings } from "@/modules/settings/server";
import { sendEmail } from "./email";

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

export async function sendOrderConfirmationEmail(order: Order): Promise<void> {
  if (!order.email) return;

  const [{ storeName }, { orderConfirmationIntro }] = await Promise.all([
    getStoreSettings(),
    getEmailTemplates(),
  ]);
  const intro = orderConfirmationIntro || `Thanks for your order, ${order.shipping.fullName}.`;

  const itemRows = order.items
    .map(
      (item) =>
        `<li>${item.title} × ${item.quantity} — ${formatEGP(item.unitPriceMinor * item.quantity)}</li>`,
    )
    .join("");

  await sendEmail({
    to: order.email,
    subject: `Order confirmed — #${order.id}`,
    html: `<p>${intro}</p><ul>${itemRows}</ul><p>Total: ${formatEGP(order.totalMinor)}</p><p>Cash on delivery.</p><p>— ${storeName}</p>`,
  });
}
