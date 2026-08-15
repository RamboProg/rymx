import { describe, expect, it } from "vitest";
import { SLUG_REGEX } from "@/modules/catalog/schema";
import { slugify } from "../slug";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Desert Cargo Pants")).toBe("desert-cargo-pants");
  });

  it("collapses non-alphanumeric runs to a single hyphen", () => {
    expect(slugify("Tops & Tees  —  SS26!")).toBe("tops-tees-ss26");
  });

  it("trims leading and trailing separators", () => {
    expect(slugify("  --Hello--  ")).toBe("hello");
  });

  it("produces slugs that satisfy SLUG_REGEX", () => {
    for (const title of ["Outerwear", "Long Sleeve Tee", "Cairo / SS26"]) {
      expect(slugify(title)).toMatch(SLUG_REGEX);
    }
  });

  it("returns an empty string when nothing alphanumeric remains", () => {
    expect(slugify("!!! ---")).toBe("");
  });
});
