"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { Order } from "../schema";
import { OrderSummary } from "./OrderSummary";

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

      <OrderSummary order={order} />

      <Button href="/shop">Continue shopping</Button>
    </div>
  );
}
