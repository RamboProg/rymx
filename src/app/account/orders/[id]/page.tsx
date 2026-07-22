import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetail } from "@/modules/orders/components/OrderDetail";
import { getOrderById } from "@/modules/orders/server";
import { getSessionClaims } from "@/modules/rbac/server";
import { listReturnsByOrder } from "@/modules/returns/server";

export const metadata: Metadata = { title: "Order — RYMX" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const claims = await getSessionClaims();
  const order = await getOrderById(id);

  // Defense in depth: the rules layer already scopes orders/{id} reads to
  // their owner, but this route reads via the Admin SDK (which bypasses
  // rules), so the ownership check has to be repeated explicitly here.
  if (!order || order.uid !== claims!.uid) {
    notFound();
  }

  const returns = await listReturnsByOrder(order.id);

  return <OrderDetail order={order} returns={returns} />;
}
