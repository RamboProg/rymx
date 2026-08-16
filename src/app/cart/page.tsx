import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CartView } from "@/modules/cart/components/CartView";
import { getShippingSettings } from "@/modules/settings/server";

export const metadata: Metadata = { title: "Cart — RYMX" };

export default async function CartPage() {
  const shippingSettings = await getShippingSettings();
  const t = await getTranslations("cart");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:px-8">
      <h1 className="font-display text-rymx-cream text-3xl font-bold">{t("title")}</h1>
      <CartView shippingSettings={shippingSettings} />
    </div>
  );
}
