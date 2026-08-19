import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductCard } from "../components/ProductCard";
import type { Product } from "../schema";

const baseProduct: Product = {
  id: "p1",
  title: "Cairo Bomber Jacket",
  slug: "cairo-bomber-jacket",
  description: "",
  status: "active",
  tags: [],
  category: "outerwear",
  media: [],
  options: [],
  minPriceMinor: 285000,
  compareAtMinor: null,
  createdAt: new Date("2026-01-01"),
  publishAt: null,
};

describe("ProductCard", () => {
  it("renders the product title, formatted price, and a link to the product page", () => {
    render(<ProductCard product={baseProduct} />);

    expect(screen.getByText("Cairo Bomber Jacket")).toBeInTheDocument();
    expect(screen.getByText(/^EGP\s2,850\.00$/)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/shop/cairo-bomber-jacket");
  });

  it("shows the compare-at price struck through when the product is on sale", () => {
    render(
      <ProductCard product={{ ...baseProduct, minPriceMinor: 200000, compareAtMinor: 285000 }} />,
    );

    expect(screen.getByText(/^EGP\s2,000\.00$/)).toBeInTheDocument();
    expect(screen.getByText(/^EGP\s2,850\.00$/)).toBeInTheDocument();
  });
});
