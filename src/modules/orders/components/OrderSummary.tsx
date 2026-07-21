import { formatEGP } from "@/lib/money";
import type { Order } from "../schema";

type OrderTotals = Pick<
  Order,
  | "items"
  | "subtotalMinor"
  | "discountMinor"
  | "discountCode"
  | "shippingFeeMinor"
  | "taxMinor"
  | "codFeeMinor"
  | "totalMinor"
>;

export function OrderSummary({ order }: { order: OrderTotals }) {
  return (
    <>
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
        {order.taxMinor > 0 && (
          <div className="text-rymx-cream/70 flex justify-between font-mono text-sm">
            <span>Tax</span>
            <span>{formatEGP(order.taxMinor)}</span>
          </div>
        )}
        {order.codFeeMinor > 0 && (
          <div className="text-rymx-cream/70 flex justify-between font-mono text-sm">
            <span>COD fee</span>
            <span>{formatEGP(order.codFeeMinor)}</span>
          </div>
        )}
        <div className="text-rymx-cream flex justify-between font-mono text-sm font-semibold">
          <span>Total</span>
          <span>{formatEGP(order.totalMinor)}</span>
        </div>
      </div>
    </>
  );
}
