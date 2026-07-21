import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DiscountForm } from "@/modules/discounts/components/admin/DiscountForm";
import { getDiscountByCode } from "@/modules/discounts/server";

export const metadata: Metadata = { title: "Edit discount — Admin — RYMX" };

export default async function EditDiscountPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const discount = await getDiscountByCode(code);
  if (!discount) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-rymx-cream text-2xl font-bold">{discount.code}</h1>
      <DiscountForm discount={discount} />
    </div>
  );
}
