"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { formatEGP } from "@/lib/money";
import type { Order } from "../schema";

// The order is handed off via sessionStorage right after checkoutAction
// returns, rather than re-read from Firestore — a guest has no session to
// read `orders/{id}` through (see orders/rules.md), and a signed-in customer
// doesn't need a round-trip just to see what they were already given.
type StoredOrder = Omit<Order, "createdAt"> & { createdAt: string };

function readStoredOrder(orderId: string): StoredOrder | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(`rymx_order_${orderId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredOrder;
  } catch {
    return null;
  }
}

export function OrderConfirmation() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const order = orderId ? readStoredOrder(orderId) : null;

  if (!order) {
    return (
      <div className="flex flex-col items-start gap-6">
        <p className="text-rymx-cream/60 font-mono text-sm">We couldn&apos;t find that order.</p>
        <Button href="/shop">Continue shopping</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-rymx-gold font-mono text-xs tracking-[0.1em] uppercase">Order placed</p>
        <h1 className="font-display text-rymx-cream text-3xl font-bold">
          Thank you, {order.shipping.fullName}
        </h1>
        <p className="text-rymx-cream/60 mt-2 font-mono text-sm">
          Order #{order.id} · Cash on delivery · {new Date(order.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {order.items.map((item) => (
          <div
            key={item.variantId}
            className="text-rymx-cream/70 flex justify-between font-mono text-sm"
          >
            <span>
              {item.title} {Object.values(item.optionValues).join(" / ")} × {item.quantity}
            </span>
            <span>{formatEGP(item.unitPriceMinor * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="border-rymx-cream/10 flex flex-col gap-2 border-t pt-4">
        <div className="text-rymx-cream/70 flex justify-between font-mono text-sm">
          <span>Subtotal</span>
          <span>{formatEGP(order.subtotalMinor)}</span>
        </div>
        {order.discountMinor > 0 && (
          <div className="text-rymx-gold flex justify-between font-mono text-sm">
            <span>Discount {order.discountCode ? `(${order.discountCode})` : ""}</span>
            <span>-{formatEGP(order.discountMinor)}</span>
          </div>
        )}
        <div className="text-rymx-cream/70 flex justify-between font-mono text-sm">
          <span>Shipping</span>
          <span>{order.shippingFeeMinor === 0 ? "Free" : formatEGP(order.shippingFeeMinor)}</span>
        </div>
        <div className="text-rymx-cream flex justify-between font-mono text-sm font-semibold">
          <span>Total</span>
          <span>{formatEGP(order.totalMinor)}</span>
        </div>
      </div>

      <Button href="/shop">Continue shopping</Button>
    </div>
  );
}
