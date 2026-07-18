import { describe, expect, it } from "vitest";
import { shopSearchParamsSchema } from "../schema";

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
