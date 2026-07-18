import { describe, expect, it } from "vitest";
import { isInStock, totalStock } from "../services/availability";

describe("isInStock", () => {
  it("is true for positive stock and false for zero", () => {
    expect(isInStock(1)).toBe(true);
    expect(isInStock(0)).toBe(false);
  });
});

describe("totalStock", () => {
  it("sums stock across variants", () => {
    expect(totalStock([{ stock: 3 }, { stock: 5 }, { stock: 0 }])).toBe(8);
  });

  it("returns 0 for no variants", () => {
    expect(totalStock([])).toBe(0);
  });
});
