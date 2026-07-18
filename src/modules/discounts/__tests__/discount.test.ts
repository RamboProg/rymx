import { describe, expect, it } from "vitest";
import type { Discount } from "../schema";
import { normalizeDiscountCode, discountRedemptionId } from "../schema";
import {
  computeDiscountMinor,
  isDiscountApplicableToCart,
  isDiscountWindowActive,
  validateDiscountEligibility,
} from "../services/discount";

const baseDiscount: Discount = {
  code: "SS26",
  type: "percent",
  value: 10,
  minSpendMinor: 0,
  startsAt: null,
  endsAt: null,
  usageLimit: null,
  redeemedCount: 0,
  perUserLimit: 1,
  productIds: [],
  collectionIds: [],
  active: true,
};

describe("normalizeDiscountCode / discountRedemptionId", () => {
  it("uppercases and trims the code", () => {
    expect(normalizeDiscountCode(" ss26 ")).toBe("SS26");
  });

  it("lowercases and trims the identity but not the code", () => {
    expect(discountRedemptionId("ss26", " User@Example.com ")).toBe("SS26__user@example.com");
  });
});

describe("computeDiscountMinor", () => {
  it("computes a percent discount, rounding down", () => {
    expect(computeDiscountMinor(9999, { ...baseDiscount, type: "percent", value: 10 })).toBe(999);
  });

  it("computes a fixed discount", () => {
    expect(computeDiscountMinor(10000, { ...baseDiscount, type: "fixed", value: 2000 })).toBe(2000);
  });

  it("never discounts more than the subtotal", () => {
    expect(computeDiscountMinor(1000, { ...baseDiscount, type: "fixed", value: 5000 })).toBe(1000);
  });
});

describe("isDiscountWindowActive", () => {
  const now = new Date("2026-01-15T00:00:00Z");

  it("is active with no window set", () => {
    expect(isDiscountWindowActive(baseDiscount, now)).toBe(true);
  });

  it("is inactive before startsAt", () => {
    expect(isDiscountWindowActive({ ...baseDiscount, startsAt: new Date("2026-02-01") }, now)).toBe(
      false,
    );
  });

  it("is inactive after endsAt", () => {
    expect(isDiscountWindowActive({ ...baseDiscount, endsAt: new Date("2026-01-01") }, now)).toBe(
      false,
    );
  });
});

describe("isDiscountApplicableToCart", () => {
  it("applies to any cart when unscoped", () => {
    expect(isDiscountApplicableToCart(baseDiscount, new Set(["p1"]), new Set())).toBe(true);
  });

  it("applies only when a cart product matches productIds scope", () => {
    const scoped = { ...baseDiscount, productIds: ["p1"] };
    expect(isDiscountApplicableToCart(scoped, new Set(["p1"]), new Set())).toBe(true);
    expect(isDiscountApplicableToCart(scoped, new Set(["p2"]), new Set())).toBe(false);
  });

  it("applies when a cart product is in the scoped collection's product set", () => {
    const scoped = { ...baseDiscount, collectionIds: ["c1"] };
    expect(isDiscountApplicableToCart(scoped, new Set(["p1"]), new Set(["p1"]))).toBe(true);
    expect(isDiscountApplicableToCart(scoped, new Set(["p9"]), new Set(["p1"]))).toBe(false);
  });
});

describe("validateDiscountEligibility", () => {
  const now = new Date("2026-01-15T00:00:00Z");
  const cartProductIds = new Set(["p1"]);
  const collectionProductIds = new Set<string>();

  function eligible(over: Partial<Discount> = {}, redemptionCount = 0) {
    return validateDiscountEligibility({
      discount: { ...baseDiscount, ...over },
      now,
      subtotalMinor: 10000,
      redemptionCount,
      cartProductIds,
      collectionProductIds,
    });
  }

  it("is ok for a plain active discount", () => {
    expect(eligible()).toEqual({ ok: true });
  });

  it("rejects an inactive discount", () => {
    expect(eligible({ active: false })).toEqual({ ok: false, reason: "inactive" });
  });

  it("rejects below minimum spend", () => {
    expect(eligible({ minSpendMinor: 20000 })).toEqual({ ok: false, reason: "below-min-spend" });
  });

  it("rejects once the global usage limit is hit", () => {
    expect(eligible({ usageLimit: 5, redeemedCount: 5 })).toEqual({
      ok: false,
      reason: "usage-limit-reached",
    });
  });

  it("rejects a repeat use of a single-use code (double-spend)", () => {
    expect(eligible({ perUserLimit: 1 }, 1)).toEqual({ ok: false, reason: "already-used" });
  });

  it("rejects an expired discount", () => {
    expect(eligible({ endsAt: new Date("2026-01-01") })).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a not-yet-started discount", () => {
    expect(eligible({ startsAt: new Date("2026-02-01") })).toEqual({
      ok: false,
      reason: "not-started",
    });
  });

  it("rejects an out-of-scope discount", () => {
    expect(eligible({ productIds: ["other"] })).toEqual({ ok: false, reason: "not-applicable" });
  });
});
