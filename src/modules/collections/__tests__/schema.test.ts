import { describe, expect, it } from "vitest";
import { isCollectionLive } from "../schema";

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
