import { describe, expect, it } from "vitest";
import {
  isOrderFullyDelivered,
  remainingToFulfill,
  validateShipmentItems,
} from "../services/fulfillment";

const orderItems = [
  { variantId: "v1", quantity: 3 },
  { variantId: "v2", quantity: 1 },
];

describe("remainingToFulfill", () => {
  it("returns full quantities with no existing shipments", () => {
    const remaining = remainingToFulfill(orderItems, []);
    expect(remaining.get("v1")).toBe(3);
    expect(remaining.get("v2")).toBe(1);
  });

  it("subtracts quantities already shipped across multiple shipments", () => {
    const remaining = remainingToFulfill(orderItems, [
      { status: "shipped", items: [{ variantId: "v1", quantity: 1 }] },
      {
        status: "delivered",
        items: [
          { variantId: "v1", quantity: 1 },
          { variantId: "v2", quantity: 1 },
        ],
      },
    ]);
    expect(remaining.get("v1")).toBe(1);
    expect(remaining.get("v2")).toBe(0);
  });
});

describe("validateShipmentItems", () => {
  it("accepts a request within remaining quantity", () => {
    const remaining = new Map([["v1", 2]]);
    expect(validateShipmentItems([{ variantId: "v1", quantity: 2 }], remaining)).toEqual({
      ok: true,
    });
  });

  it("rejects a request that overships a variant", () => {
    const remaining = new Map([["v1", 1]]);
    const result = validateShipmentItems([{ variantId: "v1", quantity: 2 }], remaining);
    expect(result.ok).toBe(false);
  });

  it("rejects a variant with nothing remaining", () => {
    const result = validateShipmentItems([{ variantId: "v9", quantity: 1 }], new Map());
    expect(result.ok).toBe(false);
  });
});

describe("isOrderFullyDelivered", () => {
  it("is false with no shipments", () => {
    expect(isOrderFullyDelivered(orderItems, [])).toBe(false);
  });

  it("is false while any shipment is still pending or shipped", () => {
    expect(
      isOrderFullyDelivered(orderItems, [
        {
          status: "shipped",
          items: [
            { variantId: "v1", quantity: 3 },
            { variantId: "v2", quantity: 1 },
          ],
        },
      ]),
    ).toBe(false);
  });

  it("is false when delivered shipments don't cover full order quantity", () => {
    expect(
      isOrderFullyDelivered(orderItems, [
        { status: "delivered", items: [{ variantId: "v1", quantity: 3 }] },
      ]),
    ).toBe(false);
  });

  it("is true once every shipment is delivered and quantities are fully covered", () => {
    expect(
      isOrderFullyDelivered(orderItems, [
        { status: "delivered", items: [{ variantId: "v1", quantity: 3 }] },
        { status: "delivered", items: [{ variantId: "v2", quantity: 1 }] },
      ]),
    ).toBe(true);
  });
});
