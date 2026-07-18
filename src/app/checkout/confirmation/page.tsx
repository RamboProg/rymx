import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderConfirmation } from "@/modules/orders/components/OrderConfirmation";

export const metadata: Metadata = { title: "Order confirmed — RYMX" };

export default function CheckoutConfirmationPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12 sm:px-8">
      <Suspense fallback={null}>
        <OrderConfirmation />
      </Suspense>
    </div>
  );
}
