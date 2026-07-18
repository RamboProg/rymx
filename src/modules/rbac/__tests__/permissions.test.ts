import { describe, expect, it } from "vitest";
import { hasPermission, isStaff } from "../services/permissions";

describe("hasPermission", () => {
  it("owner bypasses all permission checks", () => {
    expect(hasPermission({ role: "owner", permissions: [] }, "staff:manage")).toBe(true);
  });

  it("returns false for missing claims", () => {
    expect(hasPermission(null, "products:write")).toBe(false);
    expect(hasPermission(undefined, "products:write")).toBe(false);
  });

  it("grants staff a permission only if it's in their assigned list", () => {
    const claims = { role: "staff" as const, permissions: ["products:write" as const] };
    expect(hasPermission(claims, "products:write")).toBe(true);
    expect(hasPermission(claims, "discounts:manage")).toBe(false);
  });

  it("denies customers by default", () => {
    expect(hasPermission({ role: "customer", permissions: [] }, "products:write")).toBe(false);
  });
});

describe("isStaff", () => {
  it("treats owner, admin, and staff as staff", () => {
    expect(isStaff("owner")).toBe(true);
    expect(isStaff("admin")).toBe(true);
    expect(isStaff("staff")).toBe(true);
  });

  it("does not treat customer or missing role as staff", () => {
    expect(isStaff("customer")).toBe(false);
    expect(isStaff(null)).toBe(false);
    expect(isStaff(undefined)).toBe(false);
  });
});
