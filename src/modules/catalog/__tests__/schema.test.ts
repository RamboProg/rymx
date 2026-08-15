import { describe, expect, it } from "vitest";
import {
  categoryInputSchema,
  productFormSchema,
  shopSearchParamsSchema,
  variantInputSchema,
} from "../schema";

describe("shopSearchParamsSchema", () => {
  it("defaults sort and page when omitted", () => {
    const result = shopSearchParamsSchema.parse({});
    expect(result).toEqual({ sort: "newest", page: 1 });
  });

  it("coerces a numeric page string", () => {
    const result = shopSearchParamsSchema.parse({ page: "3" });
    expect(result.page).toBe(3);
  });

  it("rejects a malformed (non-numeric) page value", () => {
    expect(shopSearchParamsSchema.safeParse({ page: "not-a-number" }).success).toBe(false);
  });

  it("rejects an unknown sort value", () => {
    expect(shopSearchParamsSchema.safeParse({ sort: "cheapest-first" }).success).toBe(false);
  });

  it("rejects page numbers below 1", () => {
    expect(shopSearchParamsSchema.safeParse({ page: "0" }).success).toBe(false);
  });
});

describe("productFormSchema", () => {
  const valid = { title: "Nile Tee", category: "tops" };

  it("accepts a minimal valid product with defaults filled in", () => {
    const parsed = productFormSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.status).toBe("draft");
    expect(parsed.success && parsed.data.media).toEqual([]);
  });

  it("rejects an empty title", () => {
    expect(productFormSchema.safeParse({ ...valid, title: "  " }).success).toBe(false);
  });

  it("requires a category", () => {
    expect(productFormSchema.safeParse({ title: "Nile Tee" }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...valid, category: "  " }).success).toBe(false);
  });

  it("does not accept a client-supplied slug (server derives it)", () => {
    const parsed = productFormSchema.safeParse({ ...valid, slug: "anything" });
    expect(parsed.success).toBe(true);
    expect(parsed.success && "slug" in parsed.data).toBe(false);
  });
});

describe("variantInputSchema", () => {
  const valid = { sku: "NT-S", priceMinor: 65000, stock: 20 };

  it("accepts a valid variant", () => {
    expect(variantInputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a negative price or stock", () => {
    expect(variantInputSchema.safeParse({ ...valid, priceMinor: -1 }).success).toBe(false);
    expect(variantInputSchema.safeParse({ ...valid, stock: -1 }).success).toBe(false);
  });

  it("rejects an empty SKU", () => {
    expect(variantInputSchema.safeParse({ ...valid, sku: "" }).success).toBe(false);
  });
});

describe("categoryInputSchema", () => {
  it("accepts a title-only category (slug + order derived server-side)", () => {
    expect(categoryInputSchema.safeParse({ title: "Outerwear" }).success).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(categoryInputSchema.safeParse({ title: "  " }).success).toBe(false);
  });
});
