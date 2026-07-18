import { describe, expect, it } from "vitest";
import { computeAdjustedStock } from "../services/adjustment";

describe("computeAdjustedStock", () => {
  it("applies a positive delta", () => {
    expect(computeAdjustedStock(10, 5)).toEqual({ ok: true, newStock: 15 });
  });

  it("applies a negative delta that stays non-negative", () => {
    expect(computeAdjustedStock(10, -5)).toEqual({ ok: true, newStock: 5 });
  });

  it("allows a negative delta that lands exactly on zero", () => {
    expect(computeAdjustedStock(5, -5)).toEqual({ ok: true, newStock: 0 });
  });

  it("rejects a delta that would take stock below zero", () => {
    const result = computeAdjustedStock(3, -5);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("currently 3");
  });
});
