"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Table, Td, Th } from "@/components/admin/Table";
import { Button } from "@/components/ui/Button";
import { formatEGP } from "@/lib/money";
import type { Product } from "@/modules/catalog/schema";
import {
  CATALOG_SORT_MODES,
  type CatalogDisplay,
  type CatalogSortMode,
} from "@/modules/settings/schema";
import { updateCatalogDisplayAction } from "@/modules/settings/server/actions";

const MODE_MESSAGE_KEYS = {
  newest: "newest",
  "best-selling": "bestSelling",
  "price-asc": "priceAsc",
  "price-desc": "priceDesc",
  manual: "manual",
} as const;

function createdAtMs(value: Date | string): number {
  return typeof value === "string" ? Date.parse(value) : value.getTime();
}

function orderProducts(
  products: Product[],
  mode: CatalogSortMode,
  soldByProductId: Record<string, number>,
  manualOrderIds: string[],
): Product[] {
  const sorted = [...products];
  if (mode === "price-asc") {
    sorted.sort(
      (a, b) =>
        a.minPriceMinor - b.minPriceMinor || createdAtMs(b.createdAt) - createdAtMs(a.createdAt),
    );
  } else if (mode === "price-desc") {
    sorted.sort(
      (a, b) =>
        b.minPriceMinor - a.minPriceMinor || createdAtMs(b.createdAt) - createdAtMs(a.createdAt),
    );
  } else if (mode === "best-selling") {
    sorted.sort(
      (a, b) =>
        (soldByProductId[b.id] ?? 0) - (soldByProductId[a.id] ?? 0) ||
        createdAtMs(b.createdAt) - createdAtMs(a.createdAt),
    );
  } else if (mode === "manual") {
    const index = new Map(manualOrderIds.map((id, i) => [id, i]));
    sorted.sort((a, b) => {
      const ai = index.has(a.id) ? index.get(a.id)! : Number.MAX_SAFE_INTEGER;
      const bi = index.has(b.id) ? index.get(b.id)! : Number.MAX_SAFE_INTEGER;
      if (ai !== bi) return ai - bi;
      return createdAtMs(b.createdAt) - createdAtMs(a.createdAt);
    });
  } else {
    sorted.sort(
      (a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt) || a.slug.localeCompare(b.slug),
    );
  }
  return sorted;
}

export function MerchandisingPanel({
  products,
  soldByProductId,
  display,
}: {
  products: Product[];
  soldByProductId: Record<string, number>;
  display: CatalogDisplay;
}) {
  const t = useTranslations("merchandising");
  const tStatus = useTranslations("productStatus");
  const router = useRouter();
  const [mode, setMode] = useState<CatalogSortMode>(display.defaultSort);
  const [manualOrderIds, setManualOrderIds] = useState<string[]>(() => {
    if (display.manualOrderIds.length > 0) return display.manualOrderIds;
    return [...products]
      .sort((a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt))
      .map((p) => p.id);
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(
    () => orderProducts(products, mode, soldByProductId, manualOrderIds),
    [products, mode, soldByProductId, manualOrderIds],
  );

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= manualOrderIds.length) return;
    setManualOrderIds((prev) => {
      const next = [...prev];
      // eslint-disable-next-line security/detect-object-injection -- bounds-checked indices
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
    setSaved(false);
  }

  async function onSave() {
    setError(null);
    setSaved(false);
    setSaving(true);
    const result = await updateCatalogDisplayAction({
      defaultSort: mode,
      manualOrderIds,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
          {t("modeLabel")}
        </p>
        <div className="flex flex-wrap gap-2">
          {CATALOG_SORT_MODES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setMode(option);
                setSaved(false);
              }}
              className={`rounded-full border px-3 py-1 font-mono text-xs tracking-[0.1em] uppercase ${
                mode === option
                  ? "border-rymx-gold text-rymx-gold"
                  : "border-rymx-cream/20 text-rymx-cream/60 hover:text-rymx-cream"
              }`}
            >
              {t(`modes.${MODE_MESSAGE_KEYS[option]}`)}
            </button>
          ))}
        </div>
        <p className="text-rymx-cream/40 font-sans text-xs">
          {t(`modeHelp.${MODE_MESSAGE_KEYS[mode]}`)}
        </p>
      </div>

      {mode === "manual" && (
        <p className="text-rymx-cream/50 font-mono text-xs">{t("manualHint")}</p>
      )}

      {preview.length === 0 ? (
        <p className="text-rymx-cream/50 font-mono text-sm">{t("empty")}</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("colPosition")}</Th>
              {mode === "manual" && <Th>{t("colReorder")}</Th>}
              <Th>{t("colTitle")}</Th>
              <Th>{t("colStatus")}</Th>
              <Th>{t("colPrice")}</Th>
              <Th>{t("colSold")}</Th>
            </tr>
          </thead>
          <tbody>
            {preview.map((product, index) => {
              const manualIndex = manualOrderIds.indexOf(product.id);
              return (
                <tr key={product.id}>
                  <Td>{index + 1}</Td>
                  {mode === "manual" && (
                    <Td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={manualIndex <= 0}
                          onClick={() => move(manualIndex, -1)}
                          aria-label={t("moveUp")}
                          className="text-rymx-cream/60 hover:text-rymx-gold disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={manualIndex < 0 || manualIndex >= manualOrderIds.length - 1}
                          onClick={() => move(manualIndex, 1)}
                          aria-label={t("moveDown")}
                          className="text-rymx-cream/60 hover:text-rymx-gold disabled:opacity-30"
                        >
                          ▼
                        </button>
                      </div>
                    </Td>
                  )}
                  <Td>{product.title}</Td>
                  <Td>{tStatus(product.status)}</Td>
                  <Td>{formatEGP(product.minPriceMinor)}</Td>
                  <Td>{soldByProductId[product.id] ?? 0}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {error && (
        <p role="alert" className="font-mono text-sm text-red-400">
          {error}
        </p>
      )}
      {saved && <p className="text-rymx-gold font-mono text-sm">{t("saved")}</p>}

      <Button type="button" disabled={saving} onClick={onSave} className="w-fit justify-center">
        {saving ? t("saving") : t("save")}
      </Button>
    </div>
  );
}
