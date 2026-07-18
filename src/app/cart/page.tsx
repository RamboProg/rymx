import type { Metadata } from "next";
import { CartView } from "@/modules/cart/components/CartView";

export const metadata: Metadata = { title: "Cart — RYMX" };

export default function CartPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:px-8">
      <h1 className="font-display text-rymx-cream text-3xl font-bold">Cart</h1>
      <CartView />
    </div>
  );
}
