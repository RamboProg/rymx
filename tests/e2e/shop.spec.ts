import { expect, test } from "@playwright/test";

// Requires the Firebase emulators running with seeded catalog data (`pnpm seed`)
// and NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true (see test:e2e wiring in CI).
test.describe("shop", () => {
  test("browses the shop grid and opens a product", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.getByRole("heading", { name: "Shop", level: 1 })).toBeVisible();

    await page.getByRole("link", { name: /cairo bomber jacket/i }).click();
    await expect(page).toHaveURL(/\/shop\/cairo-bomber-jacket/);
    await expect(page.getByRole("heading", { name: "Cairo Bomber Jacket" })).toBeVisible();
  });

  test("groups the default view into category sections", async ({ page }) => {
    await page.goto("/shop");
    // Each seeded category renders its own heading (a big section title), not a
    // flat grid. Seed provides Tops, Bottoms, and Outerwear.
    await expect(page.getByRole("heading", { level: 2, name: "Tops" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Bottoms" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Outerwear" })).toBeVisible();
  });

  test("filters by category", async ({ page }) => {
    await page.goto("/shop");
    // ShopFilters uses a Radix Select (not a native <select>): open the trigger,
    // then pick the option.
    await page.getByLabel("Filter by category").click();
    await page.getByRole("option", { name: "Tops", exact: true }).click();
    await expect(page).toHaveURL(/category=tops/);
    await expect(page.getByRole("link", { name: /nile tee/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /cairo bomber jacket/i })).toHaveCount(0);
  });

  test("selects a variant on the product page", async ({ page }) => {
    await page.goto("/shop/nile-tee");
    await page.getByRole("button", { name: "XL" }).click();
    await expect(page.getByText("Out of stock")).toBeVisible();
  });

  test("browses a live collection", async ({ page }) => {
    await page.goto("/collections/ss26-launch");
    await expect(page.getByRole("heading", { name: "SS26 Launch" })).toBeVisible();
    await expect(page.getByRole("link", { name: /nile tee/i })).toBeVisible();
  });
});
