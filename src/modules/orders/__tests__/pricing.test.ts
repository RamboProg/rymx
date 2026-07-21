import { describe, expect, it } from "vitest";
import { computeSubtotalMinor, computeTaxMinor, computeTotalMinor } from "../services/pricing";

describe("computeSubtotalMinor", () => {
  it("sums unit price times quantity across lines", () => {
    const items = [
      { unitPriceMinor: 1000, quantity: 2 },
      { unitPriceMinor: 500, quantity: 3 },
    ];
    expect(computeSubtotalMinor(items)).toBe(3500);
  });

  it("returns 0 for no items", () => {
    expect(computeSubtotalMinor([])).toBe(0);
  });
});

describe("computeTaxMinor", () => {
  it("computes a percentage of the amount, rounding to the nearest piastre", () => {
    expect(computeTaxMinor(10000, 14)).toBe(1400);
    expect(computeTaxMinor(999, 10)).toBe(100);
  });

  it("is zero at a 0% rate", () => {
    expect(computeTaxMinor(10000, 0)).toBe(0);
  });
});

describe("computeTotalMinor", () => {
  it("adds shipping, tax, and COD fee after subtracting the discount", () => {
    const total = computeTotalMinor({
      subtotalMinor: 10000,
      discountMinor: 1000,
      shippingFeeMinor: 5000,
      taxMinor: 1000,
      codFeeMinor: 500,
    });
    expect(total).toBe(15500);
  });

  it("never goes negative when the discount exceeds the subtotal", () => {
    const total = computeTotalMinor({
      subtotalMinor: 500,
      discountMinor: 5000,
      shippingFeeMinor: 5000,
      taxMinor: 0,
      codFeeMinor: 0,
    });
    expect(total).toBe(5000);
  });
});
