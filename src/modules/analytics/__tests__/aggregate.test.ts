import { describe, expect, it } from "vitest";
import {
  aggregateDailySales,
  aggregateDiscountPerformance,
  aggregateMostReturnedItems,
  aggregateReturnReasons,
  aggregateTopCollections,
  aggregateTopProducts,
} from "../services/aggregate";

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

describe("aggregateDailySales", () => {
  it("buckets orders by day and sums revenue, excluding cancelled orders", () => {
    const orders = [
      {
        createdAt: today,
        status: "pending",
        totalMinor: 1000,
        discountMinor: 0,
        discountCode: null,
        items: [],
      },
      {
        createdAt: today,
        status: "delivered",
        totalMinor: 2000,
        discountMinor: 0,
        discountCode: null,
        items: [],
      },
      {
        createdAt: today,
        status: "cancelled",
        totalMinor: 5000,
        discountMinor: 0,
        discountCode: null,
        items: [],
      },
    ];
    const result = aggregateDailySales(orders, 7);
    const todayBucket = result[result.length - 1]!;
    expect(todayBucket.orderCount).toBe(2);
    expect(todayBucket.revenueMinor).toBe(3000);
  });

  it("returns one bucket per requested day, even with no orders", () => {
    expect(aggregateDailySales([], 14)).toHaveLength(14);
  });

  it("excludes orders older than the requested window", () => {
    const old = new Date(today);
    old.setDate(old.getDate() - 100);
    const orders = [
      {
        createdAt: old,
        status: "delivered",
        totalMinor: 9999,
        discountMinor: 0,
        discountCode: null,
        items: [],
      },
    ];
    const result = aggregateDailySales(orders, 7);
    expect(result.reduce((sum, b) => sum + b.revenueMinor, 0)).toBe(0);
  });
});

describe("aggregateTopProducts", () => {
  it("sums quantity and revenue per product across orders, sorted by revenue desc", () => {
    const orders = [
      {
        createdAt: today,
        status: "delivered",
        totalMinor: 0,
        discountMinor: 0,
        discountCode: null,
        items: [{ productId: "p1", title: "Tee", quantity: 2, unitPriceMinor: 500 }],
      },
      {
        createdAt: today,
        status: "delivered",
        totalMinor: 0,
        discountMinor: 0,
        discountCode: null,
        items: [{ productId: "p2", title: "Jacket", quantity: 1, unitPriceMinor: 3000 }],
      },
      {
        createdAt: today,
        status: "cancelled",
        totalMinor: 0,
        discountMinor: 0,
        discountCode: null,
        items: [{ productId: "p2", title: "Jacket", quantity: 5, unitPriceMinor: 3000 }],
      },
    ];
    const result = aggregateTopProducts(orders, 10);
    expect(result[0]).toEqual({
      productId: "p2",
      title: "Jacket",
      quantitySold: 1,
      revenueMinor: 3000,
    });
    expect(result[1]).toEqual({
      productId: "p1",
      title: "Tee",
      quantitySold: 2,
      revenueMinor: 1000,
    });
  });

  it("respects the limit", () => {
    const orders = Array.from({ length: 5 }, (_, i) => ({
      createdAt: today,
      status: "delivered",
      totalMinor: 0,
      discountMinor: 0,
      discountCode: null,
      items: [{ productId: `p${i}`, title: `Item ${i}`, quantity: 1, unitPriceMinor: i * 100 }],
    }));
    expect(aggregateTopProducts(orders, 2)).toHaveLength(2);
  });

  it("excludes orders before the since cutoff when provided", () => {
    const old = new Date(today);
    old.setDate(old.getDate() - 100);
    const orders = [
      {
        createdAt: old,
        status: "delivered",
        totalMinor: 0,
        discountMinor: 0,
        discountCode: null,
        items: [{ productId: "p1", title: "Old Tee", quantity: 3, unitPriceMinor: 500 }],
      },
      {
        createdAt: today,
        status: "delivered",
        totalMinor: 0,
        discountMinor: 0,
        discountCode: null,
        items: [{ productId: "p2", title: "New Tee", quantity: 1, unitPriceMinor: 500 }],
      },
    ];
    const since = new Date(today);
    since.setDate(since.getDate() - 7);
    const result = aggregateTopProducts(orders, 10, since);
    expect(result).toHaveLength(1);
    expect(result[0]?.productId).toBe("p2");
  });

  it("preserves all-time behavior when since is omitted", () => {
    const old = new Date(today);
    old.setDate(old.getDate() - 100);
    const orders = [
      {
        createdAt: old,
        status: "delivered",
        totalMinor: 0,
        discountMinor: 0,
        discountCode: null,
        items: [{ productId: "p1", title: "Old Tee", quantity: 3, unitPriceMinor: 500 }],
      },
    ];
    expect(aggregateTopProducts(orders, 10)).toHaveLength(1);
  });
});

describe("aggregateTopCollections", () => {
  it("returns an empty array for no orders", () => {
    expect(
      aggregateTopCollections([], [{ id: "c1", title: "Summer", productIds: ["p1"] }], 10),
    ).toEqual([]);
  });

  it("attributes a line item's quantity/revenue to every collection its product belongs to, sorted by revenue desc", () => {
    const collections = [
      { id: "c1", title: "Summer", productIds: ["p1"] },
      { id: "c2", title: "Sale", productIds: ["p1", "p2"] },
    ];
    const orders = [
      {
        createdAt: today,
        status: "delivered",
        totalMinor: 0,
        discountMinor: 0,
        discountCode: null,
        items: [
          { productId: "p1", title: "Tee", quantity: 2, unitPriceMinor: 500 },
          { productId: "p2", title: "Jacket", quantity: 1, unitPriceMinor: 3000 },
        ],
      },
    ];
    const result = aggregateTopCollections(orders, collections, 10);
    expect(result[0]).toEqual({
      collectionId: "c2",
      title: "Sale",
      quantitySold: 3,
      revenueMinor: 4000,
    });
    expect(result[1]).toEqual({
      collectionId: "c1",
      title: "Summer",
      quantitySold: 2,
      revenueMinor: 1000,
    });
  });

  it("excludes orders before the since cutoff when provided", () => {
    const old = new Date(today);
    old.setDate(old.getDate() - 100);
    const collections = [{ id: "c1", title: "Summer", productIds: ["p1"] }];
    const orders = [
      {
        createdAt: old,
        status: "delivered",
        totalMinor: 0,
        discountMinor: 0,
        discountCode: null,
        items: [{ productId: "p1", title: "Tee", quantity: 5, unitPriceMinor: 500 }],
      },
    ];
    const since = new Date(today);
    since.setDate(since.getDate() - 7);
    expect(aggregateTopCollections(orders, collections, 10, since)).toEqual([]);
  });
});

describe("aggregateMostReturnedItems", () => {
  it("returns an empty array for no returns", () => {
    expect(aggregateMostReturnedItems([], 10)).toEqual([]);
  });

  it("sums returned quantity per product across every return regardless of status, sorted desc", () => {
    const returns = [
      {
        items: [
          { productId: "p1", title: "Tee", quantity: 2, reasonCategory: "wrong_size" },
          { productId: "p2", title: "Jacket", quantity: 1, reasonCategory: "defective" },
        ],
      },
      {
        items: [{ productId: "p1", title: "Tee", quantity: 4, reasonCategory: "changed_mind" }],
      },
    ];
    const result = aggregateMostReturnedItems(returns, 10);
    expect(result[0]).toEqual({ productId: "p1", title: "Tee", quantityReturned: 6 });
    expect(result[1]).toEqual({ productId: "p2", title: "Jacket", quantityReturned: 1 });
  });

  it("respects the limit", () => {
    const returns = Array.from({ length: 5 }, (_, i) => ({
      items: [{ productId: `p${i}`, title: `Item ${i}`, quantity: 1, reasonCategory: "other" }],
    }));
    expect(aggregateMostReturnedItems(returns, 2)).toHaveLength(2);
  });
});

describe("aggregateReturnReasons", () => {
  it("returns an empty array for no returns", () => {
    expect(aggregateReturnReasons([])).toEqual([]);
  });

  it("counts returned quantity per reason category across every return regardless of status, sorted desc", () => {
    const returns = [
      {
        items: [
          { productId: "p1", title: "Tee", quantity: 2, reasonCategory: "wrong_size" },
          { productId: "p2", title: "Jacket", quantity: 1, reasonCategory: "defective" },
        ],
      },
      {
        items: [{ productId: "p1", title: "Tee", quantity: 3, reasonCategory: "wrong_size" }],
      },
    ];
    expect(aggregateReturnReasons(returns)).toEqual([
      { reasonCategory: "wrong_size", count: 5 },
      { reasonCategory: "defective", count: 1 },
    ]);
  });
});

describe("aggregateDiscountPerformance", () => {
  it("sums discount given per code from non-cancelled orders and joins with redemption count", () => {
    const orders = [
      {
        createdAt: today,
        status: "delivered",
        totalMinor: 0,
        discountMinor: 500,
        discountCode: "SS26",
        items: [],
      },
      {
        createdAt: today,
        status: "delivered",
        totalMinor: 0,
        discountMinor: 300,
        discountCode: "SS26",
        items: [],
      },
      {
        createdAt: today,
        status: "cancelled",
        totalMinor: 0,
        discountMinor: 999,
        discountCode: "SS26",
        items: [],
      },
    ];
    const discounts = [{ code: "SS26", redeemedCount: 2 }];
    expect(aggregateDiscountPerformance(orders, discounts)).toEqual([
      { code: "SS26", redeemedCount: 2, discountGivenMinor: 800 },
    ]);
  });

  it("omits never-redeemed discounts", () => {
    expect(aggregateDiscountPerformance([], [{ code: "UNUSED", redeemedCount: 0 }])).toEqual([]);
  });
});
