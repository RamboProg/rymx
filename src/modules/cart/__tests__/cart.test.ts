import { describe, expect, it } from "vitest";
import { addItem, cartItemCount, removeItem, updateItemQuantity } from "../services/cart";
import { CART_MAX_QUANTITY, cartItemSchema, type CartItem } from "../schema";

describe("cartItemSchema", () => {
  it("rejects zero, negative, and non-integer quantities", () => {
    expect(
      cartItemSchema.safeParse({ productId: "p1", variantId: "v1", quantity: 0 }).success,
    ).toBe(false);
    expect(
      cartItemSchema.safeParse({ productId: "p1", variantId: "v1", quantity: -3 }).success,
    ).toBe(false);
    expect(
      cartItemSchema.safeParse({ productId: "p1", variantId: "v1", quantity: 1.5 }).success,
    ).toBe(false);
  });

  it("rejects quantity above CART_MAX_QUANTITY", () => {
    expect(
      cartItemSchema.safeParse({
        productId: "p1",
        variantId: "v1",
        quantity: CART_MAX_QUANTITY + 1,
      }).success,
    ).toBe(false);
  });

  it("accepts a valid quantity", () => {
    expect(
      cartItemSchema.safeParse({ productId: "p1", variantId: "v1", quantity: 1 }).success,
    ).toBe(true);
  });
});

const line = (over: Partial<CartItem> = {}): CartItem => ({
  productId: "p1",
  variantId: "v1",
  quantity: 1,
  ...over,
});

describe("addItem", () => {
  it("appends a new line", () => {
    const result = addItem([], line());
    expect(result).toEqual([line()]);
  });

  it("merges quantity into an existing line for the same variant", () => {
    const result = addItem([line({ quantity: 2 })], line({ quantity: 3 }));
    expect(result).toEqual([line({ quantity: 5 })]);
  });

  it("keeps separate lines for different variants of the same product", () => {
    const result = addItem([line({ variantId: "v1" })], line({ variantId: "v2" }));
    expect(result).toHaveLength(2);
  });

  it("clamps merged quantity to CART_MAX_QUANTITY", () => {
    const result = addItem([line({ quantity: CART_MAX_QUANTITY })], line({ quantity: 5 }));
    expect(result[0]!.quantity).toBe(CART_MAX_QUANTITY);
  });
});

describe("updateItemQuantity", () => {
  it("sets a new quantity", () => {
    const result = updateItemQuantity([line({ quantity: 1 })], "v1", 4);
    expect(result[0]!.quantity).toBe(4);
  });

  it("removes the line when quantity is 0 or less", () => {
    expect(updateItemQuantity([line()], "v1", 0)).toEqual([]);
    expect(updateItemQuantity([line()], "v1", -3)).toEqual([]);
  });

  it("clamps quantity to CART_MAX_QUANTITY", () => {
    const result = updateItemQuantity([line()], "v1", 1000);
    expect(result[0]!.quantity).toBe(CART_MAX_QUANTITY);
  });
});

describe("removeItem", () => {
  it("removes only the matching variant", () => {
    const result = removeItem([line({ variantId: "v1" }), line({ variantId: "v2" })], "v1");
    expect(result).toEqual([line({ variantId: "v2" })]);
  });
});

describe("cartItemCount", () => {
  it("sums quantities across lines", () => {
    expect(cartItemCount([line({ quantity: 2 }), line({ variantId: "v2", quantity: 3 })])).toBe(5);
  });

  it("returns 0 for an empty cart", () => {
    expect(cartItemCount([])).toBe(0);
  });
});
