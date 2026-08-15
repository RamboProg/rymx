import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Table, Td, Th } from "@/components/admin/Table";
import { InventoryTable } from "@/modules/inventory/components/InventoryTable";
import { listAdjustments, listVariantsAcrossProducts } from "@/modules/inventory/server";

export const metadata: Metadata = { title: "Inventory — Admin — RYMX" };

export default async function AdminInventoryPage() {
  const [rows, adjustments, t] = await Promise.all([
    listVariantsAcrossProducts(),
    listAdjustments(20),
    getTranslations("inventory"),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-rymx-cream text-2xl font-bold">{t("title")}</h1>
          <p className="text-rymx-cream/50 font-sans text-sm">{t("description")}</p>
        </div>
        {rows.length === 0 ? (
          <p className="text-rymx-cream/50 font-mono text-sm">{t("empty")}</p>
        ) : (
          <InventoryTable rows={rows} />
        )}
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-rymx-cream text-lg font-bold">
            {t("adjustmentsTitle")}
          </h2>
          <p className="text-rymx-cream/50 font-sans text-sm">{t("adjustmentsDescription")}</p>
        </div>
        {adjustments.length === 0 ? (
          <p className="text-rymx-cream/50 font-mono text-sm">{t("noAdjustments")}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("colProduct")}</Th>
                <Th>{t("colSku")}</Th>
                <Th>{t("colChange")}</Th>
                <Th>{t("colNewStock")}</Th>
                <Th>{t("colReason")}</Th>
                <Th>{t("colWhen")}</Th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((adjustment) => (
                <tr key={adjustment.id}>
                  <Td>{adjustment.productTitle}</Td>
                  <Td>{adjustment.sku}</Td>
                  <Td>{adjustment.delta > 0 ? `+${adjustment.delta}` : adjustment.delta}</Td>
                  <Td>{adjustment.newStock}</Td>
                  <Td>{adjustment.reason}</Td>
                  <Td>{adjustment.createdAt.toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </div>
  );
}
