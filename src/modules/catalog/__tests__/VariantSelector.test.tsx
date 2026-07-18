import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VariantSelector } from "../components/VariantSelector";
import type { Product, Variant } from "../schema";

const addMock = vi.fn();
vi.mock("@/modules/cart/hooks/useCart", () => ({
  useCart: () => ({ add: addMock, pending: false }),
}));

const product: Product = {
  id: "p1",
  title: "Nile Tee",
  slug: "nile-tee",
  description: "",
  status: "active",
  tags: [],
  category: "tops",
  media: [],
  options: [{ name: "Size", values: ["S", "M", "XL"] }],
  minPriceMinor: 65000,
  createdAt: new Date("2026-01-01"),
  seoTitle: null,
  seoDescription: null,
  publishAt: null,
};

const variants: Variant[] = [
  {
    id: "v1",
    sku: "NT-S",
    optionValues: { Size: "S" },
    priceMinor: 65000,
    compareAtMinor: null,
    stock: 20,
  },
  {
    id: "v2",
    sku: "NT-M",
    optionValues: { Size: "M" },
    priceMinor: 65000,
    compareAtMinor: null,
    stock: 25,
  },
  {
    id: "v3",
    sku: "NT-XL",
    optionValues: { Size: "XL" },
    priceMinor: 65000,
    compareAtMinor: null,
    stock: 0,
  },
];

describe("VariantSelector", () => {
  it("defaults to the first option value and shows its price", () => {
    render(<VariantSelector product={product} variants={variants} />);
    expect(screen.getByRole("button", { name: "S" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/^EGP\s650\.00$/)).toBeInTheDocument();
  });

  it("shows an out-of-stock notice when the selected variant has zero stock", async () => {
    const user = userEvent.setup();
    render(<VariantSelector product={product} variants={variants} />);

    await user.click(screen.getByRole("button", { name: "XL" }));

    expect(screen.getByRole("button", { name: "XL" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeDisabled();
  });

  it("adds the selected variant to the cart", async () => {
    const user = userEvent.setup();
    render(<VariantSelector product={product} variants={variants} />);

    await user.click(screen.getByRole("button", { name: "Add to cart" }));

    expect(addMock).toHaveBeenCalledWith({ productId: "p1", variantId: "v1", quantity: 1 });
    expect(await screen.findByRole("button", { name: "Added to cart" })).toBeInTheDocument();
  });
});
