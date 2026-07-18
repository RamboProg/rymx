"use client";

import { useState } from "react";
import { Table, Td, Th } from "@/components/admin/Table";
import { adjustStockAction } from "../server/actions";
import { LOW_STOCK_THRESHOLD, type VariantStockRow } from "../schema";

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

  async function onApply() {
    setError(null);
    const deltaNumber = Number(delta);
    if (!Number.isInteger(deltaNumber) || deltaNumber === 0) {
      setError("Enter a non-zero whole number");
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
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="number"
        value={delta}
        onChange={(e) => setDelta(e.target.value)}
        placeholder="±"
        className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold w-16 rounded-md border px-2 py-1 font-mono text-xs outline-none"
      />
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason"
        className="border-rymx-cream/20 bg-rymx-card text-rymx-cream focus:border-rymx-gold min-w-0 flex-1 rounded-md border px-2 py-1 font-mono text-xs outline-none"
      />
      <button
        type="button"
        disabled={pending}
        onClick={onApply}
        className="border-rymx-gold text-rymx-gold hover:bg-rymx-gold rounded-md border px-3 py-1 font-mono text-xs uppercase hover:text-[#12100a] disabled:opacity-50"
      >
        Apply
      </button>
      {error && <p className="w-full font-mono text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function InventoryTable({ rows: initialRows }: { rows: VariantStockRow[] }) {
  const [rows, setRows] = useState(initialRows);

  return (
    <Table>
      <thead>
        <tr>
          <Th>Product</Th>
          <Th>SKU</Th>
          <Th>Options</Th>
          <Th>Stock</Th>
          <Th>Adjust</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.variantId}>
            <Td>{row.productTitle}</Td>
            <Td>{row.sku}</Td>
            <Td>{Object.values(row.optionValues).join(" / ")}</Td>
            <Td>
              <span className={row.stock <= LOW_STOCK_THRESHOLD ? "text-red-400" : undefined}>
                {row.stock}
              </span>
              {row.stock <= LOW_STOCK_THRESHOLD && (
                <span className="ml-2 font-mono text-xs text-red-400 uppercase">Low</span>
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
  );
}
