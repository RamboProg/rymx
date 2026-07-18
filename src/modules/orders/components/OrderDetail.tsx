import type { Order } from "../schema";
import { OrderSummary } from "./OrderSummary";

export function OrderDetail({ order }: { order: Order }) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-rymx-cream text-2xl font-bold">Order #{order.id}</h1>
        <p className="text-rymx-cream/60 mt-2 font-mono text-sm">
          Cash on delivery · {order.createdAt.toLocaleString()} · {order.status}
        </p>
      </div>
      <OrderSummary order={order} />
      <div className="text-rymx-cream/60 font-mono text-xs">
        <p className="text-rymx-cream">{order.shipping.fullName}</p>
        <p>{order.shipping.phone}</p>
        <p>
          {order.shipping.addressLine}, {order.shipping.city}, {order.shipping.governorate}
        </p>
      </div>
    </div>
  );
}
