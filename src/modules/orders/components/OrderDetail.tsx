import { formatEGP } from "@/lib/money";
import { RequestReturnForm } from "@/modules/returns/components/RequestReturnForm";
import { returnReasonLabel, type Return } from "@/modules/returns/schema";
import { remainingToReturn } from "@/modules/returns/services/refund";
import type { Order } from "../schema";
import { OrderSummary } from "./OrderSummary";

export function OrderDetail({ order, returns }: { order: Order; returns: Return[] }) {
  const remaining = remainingToReturn(order.items, returns);
  const canRequestReturn =
    order.status === "delivered" &&
    order.items.some((item) => (remaining.get(item.variantId) ?? 0) > 0);

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

      {returns.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-rymx-cream text-lg font-bold">Returns</h2>
          <ul className="flex flex-col gap-3">
            {returns.map((ret) => (
              <li
                key={ret.id}
                className="border-rymx-cream/10 bg-rymx-card flex flex-col gap-2 rounded-md border p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-rymx-gold font-mono text-xs tracking-[0.1em] uppercase">
                    {ret.status}
                  </span>
                  <span className="text-rymx-cream/40 font-mono text-xs">
                    {ret.createdAt.toLocaleString()}
                  </span>
                </div>
                <ul className="text-rymx-cream/80 font-mono text-sm">
                  {ret.items.map((item) => (
                    <li key={item.variantId}>
                      {item.title} × {item.quantity} — {returnReasonLabel(item)}
                    </li>
                  ))}
                </ul>
                <p className="text-rymx-cream/60 font-mono text-xs">
                  Refund: {formatEGP(ret.refundMinor)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canRequestReturn && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-rymx-cream text-lg font-bold">Request a return</h2>
          <RequestReturnForm order={order} returns={returns} />
        </section>
      )}
    </div>
  );
}
