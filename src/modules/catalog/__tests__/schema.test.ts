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
  const valid = { title: "Nile Tee", slug: "nile-tee" };

  it("accepts a minimal valid product with defaults filled in", () => {
    const parsed = productFormSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.status).toBe("draft");
    expect(parsed.success && parsed.data.media).toEqual([]);
  });

  it("rejects an empty title", () => {
    expect(productFormSchema.safeParse({ ...valid, title: "  " }).success).toBe(false);
  });

  it("rejects a slug with uppercase or spaces", () => {
    expect(productFormSchema.safeParse({ ...valid, slug: "Nile Tee" }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...valid, slug: "nile_tee" }).success).toBe(false);
  });

  it("accepts a hyphenated lowercase slug", () => {
    expect(productFormSchema.safeParse({ ...valid, slug: "cairo-bomber-jacket-2" }).success).toBe(
      true,
    );
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
  it("accepts a valid category", () => {
    expect(categoryInputSchema.safeParse({ title: "Outerwear", slug: "outerwear" }).success).toBe(
      true,
    );
  });

  it("rejects an invalid slug", () => {
    expect(categoryInputSchema.safeParse({ title: "Outerwear", slug: "Outer Wear!" }).success).toBe(
      false,
    );
  });
});
