import { getTranslations } from "next-intl/server";
import { formatEGP } from "@/lib/money";
import type { Discount } from "../schema";

export async function PersonalPromoList({ discounts }: { discounts: Discount[] }) {
  const t = await getTranslations("account");
  if (discounts.length === 0) {
    return <p className="text-rymx-cream/50 font-mono text-sm">{t("noPersonalPromoCodes")}</p>;
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
              ? t("percentOff", { value: discount.value })
              : t("amountOff", { amount: formatEGP(discount.value) })}
          </span>
        </li>
      ))}
    </ul>
  );
}
