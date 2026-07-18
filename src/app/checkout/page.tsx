import type { Metadata } from "next";
import { CheckoutView } from "@/modules/orders/components/CheckoutView";

export const metadata: Metadata = { title: "Checkout — RYMX" };

export default function CheckoutPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:px-8">
      <h1 className="font-display text-rymx-cream text-3xl font-bold">Checkout</h1>
      <CheckoutView />
    </div>
  );
}
