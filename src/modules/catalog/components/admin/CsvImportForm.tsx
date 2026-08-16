"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { finishCsvImportAction, importParsedProductAction } from "../../server/actions";
import type { CsvImportSummary } from "../../server/admin";
import { parseShopifyProductsCsv } from "../../services/csvImport";

const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;

export function CsvImportForm() {
  const t = useTranslations("csvImport");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CsvImportSummary | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError(t("noFile"));
      return;
    }
    if (file.size === 0) {
      setError(t("emptyFile"));
      return;
    }
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      setError(t("fileTooLarge"));
      return;
    }

    setError(null);
    setSummary(null);
    setImporting(true);
    setProgress({ current: 0, total: 0 });

    try {
      const text = await file.text();
      const { products, skipped: parseSkipped } = parseShopifyProductsCsv(text);
      const skipped = [...parseSkipped];
      const total = products.length;
      setProgress({ current: 0, total });

      let productsCreated = 0;
      let variantsCreated = 0;
      let categoriesCreated = 0;

      for (let i = 0; i < products.length; i++) {
        const product = products[i]!;
        const result = await importParsedProductAction(product);
        if (result.ok) {
          productsCreated += result.result.productsCreated;
          variantsCreated += result.result.variantsCreated;
          categoriesCreated += result.result.categoriesCreated;
        } else {
          skipped.push({ handle: product.handle, reason: result.error });
        }
        setProgress({ current: i + 1, total });
      }

      await finishCsvImportAction();
      setSummary({ productsCreated, variantsCreated, categoriesCreated, skipped });
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFileName(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("importFailed"));
    } finally {
      setImporting(false);
      setProgress(null);
    }
  }

  const percent =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : importing
        ? 0
        : null;

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

        {importing && (
          <div className="flex max-w-md flex-col gap-2" aria-live="polite">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent ?? 0}
              aria-label={t("progressLabel")}
              className="bg-rymx-cream/10 h-2 w-full overflow-hidden rounded-full"
            >
              <div
                className="bg-rymx-gold h-full rounded-full transition-[width] duration-300 ease-out"
                style={{ width: `${percent ?? 0}%` }}
              />
            </div>
            <p className="text-rymx-cream/60 font-mono text-xs">
              {progress && progress.total > 0
                ? t("progress", { current: progress.current, total: progress.total })
                : t("preparing")}
            </p>
          </div>
        )}
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
