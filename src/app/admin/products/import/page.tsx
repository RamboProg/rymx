import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CsvImportForm } from "@/modules/catalog/components/admin/CsvImportForm";

export const metadata: Metadata = { title: "Import products — Admin — RYMX" };

export default async function ImportProductsPage() {
  const t = await getTranslations("csvImport");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-rymx-cream text-2xl font-bold">{t("title")}</h1>
        <p className="text-rymx-cream/50 font-sans text-sm">{t("description")}</p>
      </div>
      <CsvImportForm />
    </div>
  );
}
