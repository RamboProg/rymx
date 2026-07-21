import { describe, expect, it } from "vitest";
import { checkAdminMutationRateLimit, checkRateLimit } from "../rateLimit";

describe("checkRateLimit", () => {
  it("allows requests up to the limit, then rejects", () => {
    const key = `test-${crypto.randomUUID()}`;
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    }
    expect(checkRateLimit(key, 3, 60_000)).toBe(false);
  });

  it("tracks independent keys separately", () => {
    const keyA = `test-a-${crypto.randomUUID()}`;
    const keyB = `test-b-${crypto.randomUUID()}`;
    expect(checkRateLimit(keyA, 1, 60_000)).toBe(true);
    expect(checkRateLimit(keyA, 1, 60_000)).toBe(false);
    expect(checkRateLimit(keyB, 1, 60_000)).toBe(true);
  });

  it("resets the window once resetAt has passed", async () => {
    const key = `test-reset-${crypto.randomUUID()}`;
    expect(checkRateLimit(key, 1, 10)).toBe(true);
    expect(checkRateLimit(key, 1, 10)).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 15));
    expect(checkRateLimit(key, 1, 10)).toBe(true);
  });
});

describe("checkAdminMutationRateLimit", () => {
  it("allows a generous burst per uid before rejecting", () => {
    const uid = `staff-${crypto.randomUUID()}`;
    for (let i = 0; i < 120; i++) {
      expect(checkAdminMutationRateLimit(uid)).toBe(true);
    }
    expect(checkAdminMutationRateLimit(uid)).toBe(false);
  });
});
