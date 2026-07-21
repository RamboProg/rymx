"use server";

import { FieldValue } from "firebase-admin/firestore";
import { headers } from "next/headers";
import { adminDb } from "@/lib/firebase/admin";
import { checkRateLimit } from "@/lib/security/rateLimit";
import {
  discountRef,
  getDiscountInTransaction,
  getRedemptionCountInTransaction,
  redemptionRef,
  resolveCollectionProductIds,
} from "@/modules/discounts/server";
import {
  computeDiscountMinor,
  discountIneligibleMessage,
  validateDiscountEligibility,
} from "@/modules/discounts/services/discount";
import { sendOrderConfirmationEmail } from "@/modules/notifications/server";
import { getSessionClaims } from "@/modules/rbac/server";
import { checkoutInputSchema, orderSchema, type Order, type OrderItem } from "../schema";
import {
  computeShippingFeeMinor,
  computeSubtotalMinor,
  computeTotalMinor,
} from "../services/pricing";

export type CheckoutResult = { ok: true; order: Order } | { ok: false; error: string };

class CheckoutError extends Error {}

async function clientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function checkoutAction(rawInput: unknown): Promise<CheckoutResult> {
  const parsed = checkoutInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "Invalid checkout details." };
  const input = parsed.data;

  const claims = await getSessionClaims();
  const uid = claims?.uid ?? null;
  const email = uid ? (claims!.email ?? null) : (input.guestEmail ?? null);
  if (!uid && !email) return { ok: false, error: "Email is required for guest checkout." };

  const rateLimitKey = uid ?? (await clientIp());
  if (!checkRateLimit(`checkout:${rateLimitKey}`, 10, 60 * 1000)) {
    return { ok: false, error: "Too many checkout attempts. Try again shortly." };
  }

  try {
    const { order, isNew } = await adminDb.runTransaction(async (tx) => {
      const orderRef = adminDb.doc(`orders/${input.idempotencyKey}`);
      const existing = await tx.get(orderRef);
      if (existing.exists) {
        // Idempotent replay: same key already produced an order, no-op.
        return {
          isNew: false,
          order: orderSchema.parse({
            ...existing.data(),
            id: existing.id,
            createdAt: existing.data()!.createdAt.toDate(),
          }),
        };
      }

      const productRefs = input.items.map((i) => adminDb.doc(`products/${i.productId}`));
      const variantRefs = input.items.map((i) =>
        adminDb.doc(`products/${i.productId}/variants/${i.variantId}`),
      );
      const [productSnaps, variantSnaps] = await Promise.all([
        Promise.all(productRefs.map((r) => tx.get(r))),
        Promise.all(variantRefs.map((r) => tx.get(r))),
      ]);

      const orderItems: OrderItem[] = input.items.map((cartItem, idx) => {
        // eslint-disable-next-line security/detect-object-injection -- idx is this map's own index, not user input
        const productSnap = productSnaps[idx]!;
        // eslint-disable-next-line security/detect-object-injection -- idx is this map's own index, not user input
        const variantSnap = variantSnaps[idx]!;
        if (!productSnap.exists || !variantSnap.exists) {
          throw new CheckoutError("An item in your cart is no longer available.");
        }
        const product = productSnap.data()!;
        const variant = variantSnap.data()!;
        if (product.status !== "active") {
          throw new CheckoutError(`${product.title} is no longer available.`);
        }
        if ((variant.stock as number) < cartItem.quantity) {
          throw new CheckoutError(`${product.title} only has ${variant.stock} left in stock.`);
        }
        return {
          productId: cartItem.productId,
          variantId: cartItem.variantId,
          sku: variant.sku,
          title: product.title,
          optionValues: variant.optionValues ?? {},
          quantity: cartItem.quantity,
          unitPriceMinor: variant.priceMinor,
        };
      });

      const subtotalMinor = computeSubtotalMinor(orderItems);

      let discountMinor = 0;
      let appliedCode: string | null = null;
      const discountIdentity = uid ?? email!;
      if (input.discountCode) {
        const discount = await getDiscountInTransaction(tx, input.discountCode);
        if (!discount) throw new CheckoutError("Invalid promo code.");

        const [redemptionCount, collectionProductIds] = await Promise.all([
          getRedemptionCountInTransaction(tx, input.discountCode, discountIdentity),
          resolveCollectionProductIds(discount.collectionIds),
        ]);
        const eligibility = validateDiscountEligibility({
          discount,
          now: new Date(),
          subtotalMinor,
          redemptionCount,
          cartProductIds: new Set(orderItems.map((i) => i.productId)),
          collectionProductIds,
          identity: discountIdentity,
        });
        if (!eligibility.ok) throw new CheckoutError(discountIneligibleMessage(eligibility.reason));

        discountMinor = computeDiscountMinor(subtotalMinor, discount);
        appliedCode = discount.code;
      }

      const shippingFeeMinor = computeShippingFeeMinor(subtotalMinor);
      const totalMinor = computeTotalMinor({ subtotalMinor, discountMinor, shippingFeeMinor });

      const newOrder = orderSchema.parse({
        id: orderRef.id,
        uid,
        email,
        shipping: input.shipping,
        items: orderItems,
        subtotalMinor,
        discountMinor,
        discountCode: appliedCode,
        shippingFeeMinor,
        totalMinor,
        status: "pending",
        paymentMethod: "cod",
        createdAt: new Date(),
      });

      tx.set(orderRef, newOrder);
      variantRefs.forEach((ref, idx) => {
        // eslint-disable-next-line security/detect-object-injection -- idx is this forEach's own index, not user input
        tx.update(ref, { stock: FieldValue.increment(-orderItems[idx]!.quantity) });
      });
      if (appliedCode) {
        tx.set(
          redemptionRef(appliedCode, discountIdentity),
          { count: FieldValue.increment(1) },
          { merge: true },
        );
        tx.update(discountRef(appliedCode), { redeemedCount: FieldValue.increment(1) });
      }
      if (uid) {
        tx.delete(adminDb.doc(`carts/${uid}`));
      }

      return { isNew: true, order: newOrder };
    });

    // Awaited (not fire-and-forget) since sendEmail never throws internally,
    // and a serverless function can be frozen/torn down before a detached
    // promise resolves — this guarantees the send attempt actually happens.
    if (isNew) await sendOrderConfirmationEmail(order);
    return { ok: true, order };
  } catch (err) {
    if (err instanceof CheckoutError) return { ok: false, error: err.message };
    throw err;
  }
}
