import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DiscountForm } from "@/modules/discounts/components/admin/DiscountForm";

export const metadata: Metadata = { title: "New discount — Admin — RYMX" };

export default async function NewDiscountPage() {
  const t = await getTranslations("discounts");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-rymx-cream text-2xl font-bold">{t("newDiscount")}</h1>
      <DiscountForm />
    </div>
  );
}
