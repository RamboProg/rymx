import { describe, expect, it } from "vitest";
import {
  computeShippingFeeMinor,
  computeSubtotalMinor,
  computeTotalMinor,
  FLAT_SHIPPING_FEE_MINOR,
  FREE_SHIPPING_THRESHOLD_MINOR,
} from "../services/pricing";

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

describe("computeShippingFeeMinor", () => {
  it("charges the flat fee below the free-shipping threshold", () => {
    expect(computeShippingFeeMinor(FREE_SHIPPING_THRESHOLD_MINOR - 1)).toBe(
      FLAT_SHIPPING_FEE_MINOR,
    );
  });

  it("is free at or above the threshold", () => {
    expect(computeShippingFeeMinor(FREE_SHIPPING_THRESHOLD_MINOR)).toBe(0);
  });
});

describe("computeTotalMinor", () => {
  it("adds shipping after subtracting the discount", () => {
    const total = computeTotalMinor({
      subtotalMinor: 10000,
      discountMinor: 1000,
      shippingFeeMinor: 5000,
    });
    expect(total).toBe(14000);
  });

  it("never goes negative when the discount exceeds the subtotal", () => {
    const total = computeTotalMinor({
      subtotalMinor: 500,
      discountMinor: 5000,
      shippingFeeMinor: 5000,
    });
    expect(total).toBe(5000);
  });
});
