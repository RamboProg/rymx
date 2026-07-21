import { describe, expect, it } from "vitest";
import type { ShippingSettings } from "../schema";
import { computeShippingFeeMinor, resolveShippingFeeMinor } from "../services/shipping";

const settings: ShippingSettings = {
  defaultFeeMinor: 5000,
  freeShippingThresholdMinor: 300000,
  zones: [{ governorates: ["Cairo", "Giza"], feeMinor: 3000 }],
};

describe("computeShippingFeeMinor", () => {
  it("charges the default flat fee below the free-shipping threshold", () => {
    expect(computeShippingFeeMinor(299999, settings)).toBe(5000);
  });

  it("is free at or above the threshold", () => {
    expect(computeShippingFeeMinor(300000, settings)).toBe(0);
  });

  it("never offers free shipping when the threshold is null", () => {
    expect(
      computeShippingFeeMinor(1000000, { ...settings, freeShippingThresholdMinor: null }),
    ).toBe(5000);
  });
});

describe("resolveShippingFeeMinor", () => {
  it("uses a zone's fee when the governorate matches", () => {
    expect(resolveShippingFeeMinor(1000, "Cairo", settings)).toBe(3000);
  });

  it("matches case- and whitespace-insensitively", () => {
    expect(resolveShippingFeeMinor(1000, "  cairo  ", settings)).toBe(3000);
  });

  it("falls back to the default fee for an unmatched governorate", () => {
    expect(resolveShippingFeeMinor(1000, "Aswan", settings)).toBe(5000);
  });

  it("the free-shipping threshold overrides any zone fee", () => {
    expect(resolveShippingFeeMinor(300000, "Cairo", settings)).toBe(0);
  });
});
