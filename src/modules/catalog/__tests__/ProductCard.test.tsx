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
  createdAt: new Date("2026-01-01"),
  seoTitle: null,
  seoDescription: null,
  publishAt: null,
};

describe("ProductCard", () => {
  it("renders the product title, formatted price, and a link to the product page", () => {
    render(<ProductCard product={baseProduct} />);

    expect(screen.getByText("Cairo Bomber Jacket")).toBeInTheDocument();
    expect(screen.getByText(/^EGP\s2,850\.00$/)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/shop/cairo-bomber-jacket");
  });

  it("shows a placeholder wordmark when there is no media", () => {
    render(<ProductCard product={baseProduct} />);
    expect(screen.getByText("RYMX")).toBeInTheDocument();
  });
});
