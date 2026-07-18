import { formatEGP } from "@/lib/money";
import type { Discount } from "../schema";

export function PersonalPromoList({ discounts }: { discounts: Discount[] }) {
  if (discounts.length === 0) {
    return (
      <p className="text-rymx-cream/50 font-mono text-sm">No personal promo codes right now.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {discounts.map((discount) => (
        <li
          key={discount.code}
          className="border-rymx-gold/30 bg-rymx-card flex items-center justify-between gap-4 rounded-md border p-4"
        >
          <span className="text-rymx-gold font-mono text-sm tracking-[0.1em] uppercase">
            {discount.code}
          </span>
          <span className="text-rymx-cream/70 font-mono text-xs">
            {discount.type === "percent"
              ? `${discount.value}% off`
              : `${formatEGP(discount.value)} off`}
          </span>
        </li>
      ))}
    </ul>
  );
}
