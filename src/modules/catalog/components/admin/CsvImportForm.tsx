"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { importProductsCsvAction } from "../../server/actions";
import type { CsvImportSummary } from "../../server/admin";

export function CsvImportForm() {
  const t = useTranslations("csvImport");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CsvImportSummary | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError(t("noFile"));
      return;
    }

    setError(null);
    setSummary(null);
    setImporting(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await importProductsCsvAction(formData);
    setImporting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSummary(result.summary);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFileName(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-rymx-cream/60 max-w-2xl font-sans text-sm">{t("intro")}</p>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex w-fit cursor-pointer flex-col gap-1">
          <span className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
            {t("fileLabel")}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            disabled={importing}
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            className="text-rymx-cream/70 file:border-rymx-gold file:text-rymx-gold font-mono text-xs file:me-3 file:rounded-full file:border file:bg-transparent file:px-3 file:py-1.5 file:font-mono file:text-xs"
          />
        </label>
        {fileName && <p className="text-rymx-cream/50 font-mono text-xs">{fileName}</p>}

        {error && (
          <p role="alert" className="font-mono text-sm text-red-400">
            {error}
          </p>
        )}

        <Button type="submit" disabled={importing} className="w-fit justify-center">
          {importing ? t("importing") : t("importButton")}
        </Button>
      </form>

      {summary && (
        <div className="border-rymx-cream/10 bg-rymx-card flex flex-col gap-2 rounded-md border p-5">
          <p className="text-rymx-gold font-mono text-sm">
            {t("summary", {
              products: summary.productsCreated,
              variants: summary.variantsCreated,
              categories: summary.categoriesCreated,
            })}
          </p>
          {summary.skipped.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
                {t("skippedHeading", { count: summary.skipped.length })}
              </p>
              <ul className="text-rymx-cream/70 font-mono text-xs">
                {summary.skipped.map((s) => (
                  <li key={s.handle}>
                    {s.handle} — {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
