"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Table, Td, Th } from "@/components/admin/Table";
import { Button } from "@/components/ui/Button";
import { Field, NumberField } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatEGP } from "@/lib/money";
import { variantInputSchema, type ProductOption, type Variant } from "../../schema";
import {
  createVariantAction,
  deleteVariantAction,
  updateVariantAction,
} from "../../server/actions";

function emptyOptionValues(options: ProductOption[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const option of options) values[option.name] = option.values[0] ?? "";
  return values;
}

export function VariantManager({
  productId,
  variants: initialVariants,
  options,
}: {
  productId: string;
  variants: Variant[];
  options: ProductOption[];
}) {
  const router = useRouter();
  const t = useTranslations("variants");
  const [variants, setVariants] = useState(initialVariants);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sku, setSku] = useState("");
  const [optionValues, setOptionValues] = useState<Record<string, string>>(
    emptyOptionValues(options),
  );
  const [price, setPrice] = useState("");
  const [compareAt, setCompareAt] = useState("");
  const [stock, setStock] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setEditingId(null);
    setSku("");
    setOptionValues(emptyOptionValues(options));
    setPrice("");
    setCompareAt("");
    setStock("");
  }

  function startEdit(variant: Variant) {
    setEditingId(variant.id);
    setSku(variant.sku);
    setOptionValues({ ...emptyOptionValues(options), ...variant.optionValues });
    setPrice((variant.priceMinor / 100).toString());
    setCompareAt(variant.compareAtMinor ? (variant.compareAtMinor / 100).toString() : "");
    setStock(variant.stock.toString());
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = variantInputSchema.safeParse({
      sku,
      optionValues,
      priceMinor: Math.round(Number(price) * 100),
      compareAtMinor: compareAt ? Math.round(Number(compareAt) * 100) : null,
      stock: Number(stock),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setSaving(true);
    const result = editingId
      ? await updateVariantAction(productId, editingId, parsed.data)
      : await createVariantAction(productId, parsed.data);
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setVariants((prev) =>
      editingId
        ? prev.map((v) => (v.id === result.variant.id ? result.variant : v))
        : [...prev, result.variant],
    );
    resetForm();
    router.refresh();
  }

  async function onDelete(variantId: string) {
    const result = await deleteVariantAction(productId, variantId);
    if (result.ok) {
      setVariants((prev) => prev.filter((v) => v.id !== variantId));
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {variants.length > 0 && (
        <Table>
          <thead>
            <tr>
              <Th>{t("colSku")}</Th>
              <Th>{t("colOptions")}</Th>
              <Th>{t("colPrice")}</Th>
              <Th>{t("colStock")}</Th>
              <Th>{t("colActions")}</Th>
            </tr>
          </thead>
          <tbody>
            {variants.map((variant) => (
              <tr key={variant.id}>
                <Td>{variant.sku}</Td>
                <Td>{Object.values(variant.optionValues).join(" / ")}</Td>
                <Td>{formatEGP(variant.priceMinor)}</Td>
                <Td>{variant.stock}</Td>
                <Td>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => startEdit(variant)}
                      className="hover:text-rymx-gold"
                    >
                      {t("edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(variant.id)}
                      className="hover:text-red-400"
                    >
                      {t("delete")}
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <h3 className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
          {editingId ? t("editTitle") : t("addTitle")}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="variant-sku"
            label={t("sku")}
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            description={t("skuHelp")}
          />
          {options.map((option) => (
            <Select
              key={option.name}
              label={option.name}
              value={optionValues[option.name] ?? ""}
              onValueChange={(value) =>
                setOptionValues((prev) => ({ ...prev, [option.name]: value }))
              }
              options={option.values.map((value) => ({ value, label: value }))}
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <NumberField
            id="variant-price"
            label={t("price")}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            description={t("priceHelp")}
          />
          <NumberField
            id="variant-compareAt"
            label={t("compareAt")}
            step="0.01"
            value={compareAt}
            onChange={(e) => setCompareAt(e.target.value)}
            description={t("compareAtHelp")}
          />
          <NumberField
            id="variant-stock"
            label={t("stock")}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            description={t("stockHelp")}
          />
        </div>
        {error && (
          <p role="alert" className="font-mono text-sm text-red-400">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="w-fit justify-center">
            {saving ? t("saving") : editingId ? t("save") : t("add")}
          </Button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-rymx-cream/50 hover:text-rymx-cream font-mono text-xs tracking-[0.1em] uppercase"
            >
              {t("cancel")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
