import { describe, expect, it } from "vitest";
import { generateBulkCodes } from "../services/codegen";

describe("generateBulkCodes", () => {
  it("generates the requested count of unique codes", () => {
    const codes = generateBulkCodes("VIP", 20);
    expect(codes).toHaveLength(20);
    expect(new Set(codes).size).toBe(20);
  });

  it("prefixes every code and uppercases it", () => {
    const codes = generateBulkCodes("vip", 5);
    for (const code of codes) {
      expect(code.startsWith("VIP-")).toBe(true);
    }
  });

  it("omits the separator when no prefix is given", () => {
    const codes = generateBulkCodes("", 5);
    for (const code of codes) {
      expect(code.includes("-")).toBe(false);
    }
  });

  it("never collides with a provided existing set", () => {
    const existing = new Set(["VIP-AAAAAA"]);
    const codes = generateBulkCodes("VIP", 5, existing);
    for (const code of codes) {
      expect(existing.has(code)).toBe(false);
    }
  });
});
