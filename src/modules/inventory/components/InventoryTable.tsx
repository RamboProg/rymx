"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Table, Td, Th } from "@/components/admin/Table";
import { Checkbox } from "@/components/ui/Checkbox";
import { Field, NumberField } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { isSizeOptionKey, sizeFromOptions } from "@/lib/options";
import { adjustStockAction } from "../server/actions";
import { LOW_STOCK_THRESHOLD, type VariantStockRow } from "../schema";

function otherOptions(optionValues: Record<string, string>): string {
  const rest = Object.entries(optionValues)
    .filter(([key]) => !isSizeOptionKey(key))
    .map(([, value]) => value);
  return rest.length > 0 ? rest.join(" / ") : "—";
}

function AdjustRow({
  row,
  onAdjusted,
}: {
  row: VariantStockRow;
  onAdjusted: (stock: number) => void;
}) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const t = useTranslations("inventory");

  async function onApply() {
    setError(null);
    const deltaNumber = Number(delta);
    if (!Number.isInteger(deltaNumber) || deltaNumber === 0) {
      setError(t("errNonZero"));
      return;
    }
    setPending(true);
    const result = await adjustStockAction({
      productId: row.productId,
      variantId: row.variantId,
      delta: deltaNumber,
      reason,
    });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    onAdjusted(result.newStock);
    setDelta("");
    setReason("");
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-24">
          <NumberField
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            placeholder={t("deltaPlaceholder")}
            className="py-1 pe-7 text-xs"
          />
        </div>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("reasonPlaceholder")}
          className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold min-w-0 flex-1 rounded-md border px-2 py-1 font-mono text-xs outline-none"
        />
        <button
          type="button"
          disabled={pending}
          onClick={onApply}
          className="border-rymx-gold text-rymx-gold hover:bg-rymx-gold rounded-md border px-3 py-1 font-mono text-xs uppercase hover:text-[#12100a] disabled:opacity-50"
        >
          {t("colAdjust")}
        </button>
      </div>
      {error && <p className="w-full font-mono text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function InventoryTable({ rows: initialRows }: { rows: VariantStockRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const t = useTranslations("inventory");

  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();
    for (const row of rows) if (row.category) categories.add(row.category);
    return [
      { value: "all", label: t("allCategories") },
      ...Array.from(categories)
        .sort()
        .map((c) => ({ value: c, label: c })),
    ];
  }, [rows, t]);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (query) {
        const haystack =
          `${row.productTitle} ${row.sku} ${sizeFromOptions(row.optionValues)}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (categoryFilter !== "all" && row.category !== categoryFilter) return false;
      if (lowStockOnly && row.stock > LOW_STOCK_THRESHOLD) return false;
      return true;
    });
  }, [rows, search, categoryFilter, lowStockOnly]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-56">
          <Field
            id="inventory-search"
            label={t("searchLabel")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            description={t("searchHelp")}
          />
        </div>
        <div className="w-48">
          <Select
            id="inventory-category"
            label={t("categoryLabel")}
            value={categoryFilter}
            onValueChange={setCategoryFilter}
            options={categoryOptions}
          />
        </div>
        <div className="pb-3">
          <Checkbox
            id="inventory-low-stock"
            label={t("lowStockOnly")}
            checked={lowStockOnly}
            onChange={setLowStockOnly}
          />
        </div>
      </div>
      <Table>
        <thead>
          <tr>
            <Th>{t("colProduct")}</Th>
            <Th>{t("colSku")}</Th>
            <Th>{t("colSize")}</Th>
            <Th>{t("colOptions")}</Th>
            <Th>{t("colStock")}</Th>
            <Th>{t("colAdjust")}</Th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <tr key={row.variantId}>
              <Td>{row.productTitle}</Td>
              <Td>{row.sku}</Td>
              <Td>{sizeFromOptions(row.optionValues)}</Td>
              <Td>{otherOptions(row.optionValues)}</Td>
              <Td>
                <span className={row.stock <= LOW_STOCK_THRESHOLD ? "text-red-400" : undefined}>
                  {row.stock}
                </span>
                {row.stock <= LOW_STOCK_THRESHOLD && (
                  <span className="ms-2 font-mono text-xs text-red-400 uppercase">{t("low")}</span>
                )}
              </Td>
              <Td>
                <AdjustRow
                  row={row}
                  onAdjusted={(newStock) => {
                    setRows((prev) =>
                      prev.map((r) =>
                        r.variantId === row.variantId ? { ...r, stock: newStock } : r,
                      ),
                    );
                  }}
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
