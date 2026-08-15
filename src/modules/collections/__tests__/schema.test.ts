import { describe, expect, it } from "vitest";
import { collectionInputSchema, isCollectionLive, isCollectionVisible } from "../schema";

describe("isCollectionLive", () => {
  it("is live when publishAt is null", () => {
    expect(isCollectionLive(null)).toBe(true);
  });

  it("is live when publishAt is in the past", () => {
    expect(isCollectionLive(new Date(Date.now() - 1000))).toBe(true);
  });

  it("is not live when publishAt is in the future", () => {
    expect(isCollectionLive(new Date(Date.now() + 1000 * 60 * 60))).toBe(false);
  });
});

describe("isCollectionVisible", () => {
  it("is visible when active and live", () => {
    expect(isCollectionVisible({ active: true, publishAt: null })).toBe(true);
  });

  it("is not visible when active but not yet live", () => {
    expect(
      isCollectionVisible({ active: true, publishAt: new Date(Date.now() + 1000 * 60 * 60) }),
    ).toBe(false);
  });

  it("is not visible when inactive even if live", () => {
    expect(isCollectionVisible({ active: false, publishAt: null })).toBe(false);
  });
});

describe("collectionInputSchema", () => {
  const valid = { title: "SS26 Launch" };

  it("accepts a minimal valid collection with defaults filled in", () => {
    const parsed = collectionInputSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.productIds).toEqual([]);
    expect(parsed.success && parsed.data.publishAt).toBeNull();
  });

  it("rejects an empty title", () => {
    expect(collectionInputSchema.safeParse({ ...valid, title: " " }).success).toBe(false);
  });

  it("does not accept a client-supplied slug (server derives it)", () => {
    const parsed = collectionInputSchema.safeParse({ ...valid, slug: "anything" });
    expect(parsed.success).toBe(true);
    expect(parsed.success && "slug" in parsed.data).toBe(false);
  });
});
