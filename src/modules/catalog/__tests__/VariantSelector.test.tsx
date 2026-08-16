import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "../../../../messages/en.json";
import { VariantSelector } from "../components/VariantSelector";
import type { Product, Variant } from "../schema";

const addMock = vi.fn().mockResolvedValue(true);
vi.mock("@/modules/cart/hooks/useCart", () => ({
  useCart: () => ({ add: addMock, pending: false }),
}));

const toastMock = { success: vi.fn(), error: vi.fn() };
vi.mock("@/components/ui/Toast", () => ({
  useToast: () => toastMock,
}));

function renderVariantSelector(product: Product, variants: Variant[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <VariantSelector product={product} variants={variants} />
    </NextIntlClientProvider>,
  );
}

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
    renderVariantSelector(product, variants);
    expect(screen.getByRole("button", { name: "S" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/^EGP\s650\.00$/)).toBeInTheDocument();
  });

  it("shows an out-of-stock notice when the selected variant has zero stock", async () => {
    const user = userEvent.setup();
    renderVariantSelector(product, variants);

    await user.click(screen.getByRole("button", { name: "XL" }));

    expect(screen.getByRole("button", { name: "XL" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeDisabled();
  });

  it("adds the selected variant to the cart", async () => {
    const user = userEvent.setup();
    renderVariantSelector(product, variants);

    await user.click(screen.getByRole("button", { name: "Add to cart" }));

    expect(addMock).toHaveBeenCalledWith({ productId: "p1", variantId: "v1", quantity: 1 });
    expect(await screen.findByRole("button", { name: "Added to cart" })).toBeInTheDocument();
  });
});
