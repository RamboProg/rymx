import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Table, Td, Th } from "@/components/admin/Table";
import { formatEGP } from "@/lib/money";
import { OrderNotes } from "@/modules/orders/components/admin/OrderNotes";
import { OrderStatusActions } from "@/modules/orders/components/admin/OrderStatusActions";
import { getOrderById, listOrderNotes } from "@/modules/orders/server";
import { ReturnPanel } from "@/modules/returns/components/ReturnPanel";
import { listReturnsByOrder } from "@/modules/returns/server";
import { ShipmentPanel } from "@/modules/shipments/components/ShipmentPanel";
import { listShipmentsByOrder } from "@/modules/shipments/server";

export const metadata: Metadata = { title: "Order — Admin — RYMX" };

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const [notes, shipments, returns] = await Promise.all([
    listOrderNotes(id),
    listShipmentsByOrder(id),
    listReturnsByOrder(id),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-rymx-cream text-2xl font-bold">
          Order #{order.id.slice(0, 8)}
        </h1>
        <p className="text-rymx-cream/50 font-mono text-xs">
          {order.createdAt.toLocaleString()} — {order.email ?? "guest"}
        </p>
      </div>

      <OrderStatusActions order={order} />

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-rymx-cream text-lg font-bold">Items</h2>
        <Table>
          <thead>
            <tr>
              <Th>Item</Th>
              <Th>SKU</Th>
              <Th>Qty</Th>
              <Th>Price</Th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.variantId}>
                <Td>{item.title}</Td>
                <Td>{item.sku}</Td>
                <Td>{item.quantity}</Td>
                <Td>{formatEGP(item.unitPriceMinor)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="text-rymx-cream/80 flex flex-col gap-1 self-end font-mono text-sm">
          <div className="flex justify-between gap-8">
            <span>Subtotal</span>
            <span>{formatEGP(order.subtotalMinor)}</span>
          </div>
          {order.discountMinor > 0 && (
            <div className="flex justify-between gap-8">
              <span>Discount ({order.discountCode})</span>
              <span>-{formatEGP(order.discountMinor)}</span>
            </div>
          )}
          <div className="flex justify-between gap-8">
            <span>Shipping</span>
            <span>{formatEGP(order.shippingFeeMinor)}</span>
          </div>
          <div className="text-rymx-cream flex justify-between gap-8 font-bold">
            <span>Total</span>
            <span>{formatEGP(order.totalMinor)}</span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-rymx-cream text-lg font-bold">Shipping address</h2>
        <p className="text-rymx-cream/80 font-mono text-sm">
          {order.shipping.fullName}
          <br />
          {order.shipping.phone}
          <br />
          {order.shipping.addressLine}, {order.shipping.city}, {order.shipping.governorate}
          {order.shipping.notes && (
            <>
              <br />
              {order.shipping.notes}
            </>
          )}
        </p>
      </section>

      <ShipmentPanel order={order} shipments={shipments} />
      <ReturnPanel order={order} returns={returns} />
      <OrderNotes orderId={order.id} notes={notes} />
    </div>
  );
}
