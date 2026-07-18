export type StockAdjustmentResult = { ok: true; newStock: number } | { ok: false; error: string };

// Never allow an adjustment to take stock negative — matches the check
// inside adjustStockAction's transaction, extracted here so the math is
// unit-testable without an emulator.
export function computeAdjustedStock(currentStock: number, delta: number): StockAdjustmentResult {
  const newStock = currentStock + delta;
  if (newStock < 0) {
    return {
      ok: false,
      error: `Adjustment would take stock below zero (currently ${currentStock}).`,
    };
  }
  return { ok: true, newStock };
}
