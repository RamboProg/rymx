"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Table, Td, Th } from "@/components/admin/Table";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
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
              <Th>SKU</Th>
              <Th>Options</Th>
              <Th>Price</Th>
              <Th>Stock</Th>
              <Th>Actions</Th>
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
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(variant.id)}
                      className="hover:text-red-400"
                    >
                      Delete
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
          {editingId ? "Edit variant" : "Add variant"}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="variant-sku"
            label="SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
          {options.map((option) => (
            <div key={option.name} className="flex flex-col gap-1.5">
              <label className="text-rymx-cream/60 font-mono text-xs tracking-[0.1em] uppercase">
                {option.name}
              </label>
              <select
                value={optionValues[option.name] ?? ""}
                onChange={(e) =>
                  setOptionValues((prev) => ({ ...prev, [option.name]: e.target.value }))
                }
                className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold rounded-md border px-4 py-3 text-sm outline-none"
              >
                {option.values.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            id="variant-price"
            label="Price (EGP)"
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <Field
            id="variant-compareAt"
            label="Compare-at (EGP, optional)"
            type="number"
            step="0.01"
            value={compareAt}
            onChange={(e) => setCompareAt(e.target.value)}
          />
          <Field
            id="variant-stock"
            label="Stock"
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="font-mono text-sm text-red-400">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="w-fit justify-center">
            {saving ? "Saving…" : editingId ? "Save variant" : "Add variant"}
          </Button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-rymx-cream/50 hover:text-rymx-cream font-mono text-xs tracking-[0.1em] uppercase"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
