import type { Metadata } from "next";
import { OrderHistoryList } from "@/modules/orders/components/OrderHistoryList";
import { listOrdersByUid } from "@/modules/orders/server";
import { getSessionClaims } from "@/modules/rbac/server";

export const metadata: Metadata = { title: "Order history — RYMX" };

export default async function OrderHistoryPage() {
  const claims = await getSessionClaims();
  const orders = await listOrdersByUid(claims!.uid);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-rymx-cream text-3xl font-bold">Order history</h1>
      <OrderHistoryList orders={orders} />
    </div>
  );
}
