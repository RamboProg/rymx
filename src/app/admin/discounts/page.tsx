import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Table, Td, Th } from "@/components/admin/Table";
import { Button } from "@/components/ui/Button";
import { formatEGP } from "@/lib/money";
import { BulkGenerateForm } from "@/modules/discounts/components/admin/BulkGenerateForm";
import { DiscountActiveToggle } from "@/modules/discounts/components/admin/DiscountActiveToggle";
import { listAllDiscounts } from "@/modules/discounts/server/admin";

export const metadata: Metadata = { title: "Discounts — Admin — RYMX" };

export default async function AdminDiscountsPage() {
  const [discounts, t, tPage] = await Promise.all([
    listAllDiscounts(),
    getTranslations("discounts"),
    getTranslations("pages.discounts"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-rymx-cream text-2xl font-bold">{tPage("title")}</h1>
          <p className="text-rymx-cream/50 font-sans text-sm">{tPage("description")}</p>
        </div>
        <Button href="/admin/discounts/new">{t("newDiscount")}</Button>
      </div>

      {discounts.length === 0 ? (
        <p className="text-rymx-cream/50 font-mono text-sm">{t("empty")}</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("colCode")}</Th>
              <Th>{t("colValue")}</Th>
              <Th>{t("colAssignedTo")}</Th>
              <Th>{t("colRedeemed")}</Th>
              <Th>{t("colStatus")}</Th>
              <Th>{t("colActions")}</Th>
            </tr>
          </thead>
          <tbody>
            {discounts.map((discount) => (
              <tr key={discount.code}>
                <Td>
                  <Link href={`/admin/discounts/${discount.code}`} className="hover:text-rymx-gold">
                    {discount.code}
                  </Link>
                </Td>
                <Td>
                  {discount.type === "percent" ? `${discount.value}%` : formatEGP(discount.value)}
                </Td>
                <Td>{discount.assignedToUid ?? "—"}</Td>
                <Td>
                  {discount.redeemedCount}
                  {discount.usageLimit ? ` / ${discount.usageLimit}` : ""}
                </Td>
                <Td>{discount.active ? t("statusActive") : t("statusInactive")}</Td>
                <Td>
                  <DiscountActiveToggle code={discount.code} active={discount.active} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <BulkGenerateForm />
    </div>
  );
}
