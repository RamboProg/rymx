import type { Metadata } from "next";
import { DiscountForm } from "@/modules/discounts/components/admin/DiscountForm";

export const metadata: Metadata = { title: "New discount — Admin — RYMX" };

export default function NewDiscountPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-rymx-cream text-2xl font-bold">New discount</h1>
      <DiscountForm />
    </div>
  );
}
