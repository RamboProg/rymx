import { describe, expect, it } from "vitest";
import { formatEGP } from "../money";

describe("formatEGP", () => {
  it("formats minor units as EGP currency", () => {
    expect(formatEGP(285000)).toMatch(/^EGP\s2,850\.00$/);
  });

  it("formats zero", () => {
    expect(formatEGP(0)).toMatch(/^EGP\s0\.00$/);
  });
});
