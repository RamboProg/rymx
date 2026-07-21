import { describe, expect, it } from "vitest";
import { remainingToReturn, validateReturnItems } from "../services/refund";

const orderItems = [
  { variantId: "v1", quantity: 2 },
  { variantId: "v2", quantity: 1 },
];

describe("remainingToReturn", () => {
  it("returns full quantities with no existing returns", () => {
    const remaining = remainingToReturn(orderItems, []);
    expect(remaining.get("v1")).toBe(2);
    expect(remaining.get("v2")).toBe(1);
  });

  it("subtracts quantities from non-rejected returns", () => {
    const remaining = remainingToReturn(orderItems, [
      { status: "requested", items: [{ variantId: "v1", quantity: 1 }] },
    ]);
    expect(remaining.get("v1")).toBe(1);
  });

  it("ignores rejected returns entirely", () => {
    const remaining = remainingToReturn(orderItems, [
      { status: "rejected", items: [{ variantId: "v1", quantity: 2 }] },
    ]);
    expect(remaining.get("v1")).toBe(2);
  });

  it("counts restocked returns as consumed", () => {
    const remaining = remainingToReturn(orderItems, [
      { status: "restocked", items: [{ variantId: "v2", quantity: 1 }] },
    ]);
    expect(remaining.get("v2")).toBe(0);
  });
});

describe("validateReturnItems", () => {
  it("accepts a request within remaining quantity", () => {
    const remaining = new Map([["v1", 2]]);
    expect(validateReturnItems([{ variantId: "v1", quantity: 2 }], remaining)).toEqual({
      ok: true,
    });
  });

  it("rejects a request exceeding what's eligible", () => {
    const remaining = new Map([["v1", 1]]);
    const result = validateReturnItems([{ variantId: "v1", quantity: 2 }], remaining);
    expect(result.ok).toBe(false);
  });
});
