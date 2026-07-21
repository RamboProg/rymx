import type { Metadata } from "next";
import { CheckoutView } from "@/modules/orders/components/CheckoutView";
import { getShippingSettings, getStoreSettings } from "@/modules/settings/server";

export const metadata: Metadata = { title: "Checkout — RYMX" };

export default async function CheckoutPage() {
  const [shippingSettings, storeSettings] = await Promise.all([
    getShippingSettings(),
    getStoreSettings(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:px-8">
      <h1 className="font-display text-rymx-cream text-3xl font-bold">Checkout</h1>
      <CheckoutView shippingSettings={shippingSettings} storeSettings={storeSettings} />
    </div>
  );
}
