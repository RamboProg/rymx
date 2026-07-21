import "server-only";

import { formatEGP } from "@/lib/money";
import type { Order } from "@/modules/orders/schema";
import { sendEmail } from "./email";

export async function sendPromoCodeEmail(params: {
  to: string;
  code: string;
  description: string;
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: `A promo code just for you — ${params.code}`,
    html: `<p>Here's your personal RYMX promo code:</p><p style="font-size:1.5em;font-weight:bold;">${params.code}</p><p>${params.description}</p>`,
  });
}

export async function sendOrderConfirmationEmail(order: Order): Promise<void> {
  if (!order.email) return;

  const itemRows = order.items
    .map(
      (item) =>
        `<li>${item.title} × ${item.quantity} — ${formatEGP(item.unitPriceMinor * item.quantity)}</li>`,
    )
    .join("");

  await sendEmail({
    to: order.email,
    subject: `Order confirmed — #${order.id}`,
    html: `<p>Thanks for your order, ${order.shipping.fullName}.</p><ul>${itemRows}</ul><p>Total: ${formatEGP(order.totalMinor)}</p><p>Cash on delivery.</p>`,
  });
}
