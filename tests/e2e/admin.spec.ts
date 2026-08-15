import { expect, test, type Page } from "@playwright/test";

// Requires the Firebase emulators running with seeded data (`pnpm seed`,
// which creates demo-owner@rymx.test [owner, full permissions] and
// demo-staff@rymx.test [staff, no permissions]) and
// NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true. Creates real products/collections
// as a side effect — like checkout/account specs, not safe to run twice
// against the same emulator session without reseeding.
const OWNER_EMAIL = "demo-owner@rymx.test";
const STAFF_EMAIL = "demo-staff@rymx.test";
const CUSTOMER_EMAIL = "demo-customer@rymx.test";
const PASSWORD = "password123";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

// Mirrors slugify() in src/lib/slug.ts — slugs are now derived from the title
// server-side (never typed), so tests compute the expected slug the same way.
function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  // Wait for the client bundle to settle so the form's onSubmit handler is
  // attached before we click — otherwise the click can trigger a native form
  // submit (a page reload that never signs in).
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible({ timeout: 15000 });
}

// The admin forms use Radix Select (not a native <select>), so option choice is
// click-trigger-then-click-option rather than selectOption().
async function chooseOption(page: Page, triggerId: string, optionName: string) {
  await page.locator(`#${triggerId}`).click();
  await page.getByRole("option", { name: optionName, exact: true }).click();
}

test.describe("admin", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Admin write flow runs once (chromium only) to avoid cross-run slug/state collisions.",
    );
  });

  test("redirects a signed-in customer away from /admin", async ({ page }) => {
    await loginAs(page, CUSTOMER_EMAIL);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("slug is derived from the title and read-only", async ({ page }) => {
    await loginAs(page, OWNER_EMAIL);
    await page.goto("/admin/products/new");

    const slugInput = page.getByLabel("Slug");
    await expect(slugInput).toHaveAttribute("readonly", "");
    await page.getByLabel("Title", { exact: true }).fill("Cairo Night Hoodie");
    await expect(slugInput).toHaveValue("cairo-night-hoodie");
  });

  test("requires a category before a product can be created", async ({ page }) => {
    await loginAs(page, OWNER_EMAIL);
    await page.goto("/admin/products/new");

    await page.getByLabel("Title", { exact: true }).fill("No Category Product");
    await page.getByRole("button", { name: "Create product" }).click();
    await expect(page.getByText("Category is required")).toBeVisible();
  });

  test("owner creates a product with a variant and media, appears in /shop, and renders copy safely", async ({
    page,
  }) => {
    await loginAs(page, OWNER_EMAIL);

    const title = `E2E Admin Tee ${Date.now()}`;
    const slug = slugify(title);
    const xssMarker = "<script>window.__xss = true;</script>";

    await page.goto("/admin/products/new");
    await page.getByLabel("Title", { exact: true }).fill(title);
    await page.getByLabel("Description", { exact: true }).fill(xssMarker);
    await chooseOption(page, "category", "Tops");
    await chooseOption(page, "status", "active");
    await page.getByRole("button", { name: "Create product" }).click();

    await expect(page).toHaveURL(new RegExp(`/admin/products/${slug}$`));
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    // Upload a valid image via MediaManager, then persist it onto the product.
    await page.locator('input[type="file"]').setInputFiles({
      name: "swatch.png",
      mimeType: "image/png",
      buffer: PNG_1X1,
    });
    await expect(page.getByPlaceholder("Alt text")).toBeVisible();
    await page.getByRole("button", { name: "Save product" }).click();
    await expect(page.getByText("Saved")).toBeVisible();

    // Add a variant.
    await page.getByLabel("SKU").fill("E2E-TEE-S");
    await page.getByLabel("Price (EGP)").fill("500");
    await page.getByLabel("Stock", { exact: true }).fill("10");
    await page.getByRole("button", { name: "Add variant" }).click();
    await expect(page.getByText("E2E-TEE-S")).toBeVisible();

    await page.goto(`/shop/${slug}`);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText("EGP 500.00")).toBeVisible();
    await expect(page.getByAltText(title)).toBeVisible();

    // The description contains a <script> tag; it must render as inert text,
    // never execute or get injected as a real element.
    await expect(page.getByText(xssMarker)).toBeVisible();
    const xssExecuted = await page.evaluate(() => (window as unknown as { __xss?: boolean }).__xss);
    expect(xssExecuted).toBeUndefined();
  });

  test("creating a variant records an initial-stock entry in the ledger", async ({ page }) => {
    await loginAs(page, OWNER_EMAIL);

    const title = `E2E Ledger Tee ${Date.now()}`;
    const slug = slugify(title);

    await page.goto("/admin/products/new");
    await page.getByLabel("Title", { exact: true }).fill(title);
    await chooseOption(page, "category", "Tops");
    await chooseOption(page, "status", "active");
    await page.getByRole("button", { name: "Create product" }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/products/${slug}$`));

    const sku = `E2E-LEDGER-${Date.now()}`;
    await page.getByLabel("SKU").fill(sku);
    await page.getByLabel("Price (EGP)").fill("300");
    await page.getByLabel("Stock", { exact: true }).fill("8");
    await page.getByRole("button", { name: "Add variant" }).click();
    await expect(page.getByText(sku)).toBeVisible();

    await page.goto("/admin/inventory");
    const ledgerRow = page.locator("tr", { hasText: sku }).filter({ hasText: "initial stock" });
    await expect(ledgerRow).toContainText("+8");
  });

  test("rejects an unsupported media file type", async ({ page }) => {
    await loginAs(page, OWNER_EMAIL);
    await page.goto("/admin/products/new");

    await page.locator('input[type="file"]').setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    });

    await expect(page.getByText(/Unsupported file type/)).toBeVisible();
  });

  test("denies a restricted staff member's attempt to save a product", async ({ page }) => {
    await loginAs(page, STAFF_EMAIL);
    await page.goto("/admin/products/new");

    await page.getByLabel("Title", { exact: true }).fill("Should Not Save");
    await chooseOption(page, "category", "Tops");
    await page.getByRole("button", { name: "Create product" }).click();

    await expect(page.getByText("Forbidden")).toBeVisible();
  });

  // The publishAt field is a Radix calendar popover (DateTimePicker), not a
  // native datetime-local input, so a date is set by opening it, paging months,
  // and clicking a day. Day 15 exists in every month: one month forward is
  // always in the future, two months back is always in the past — deterministic
  // without depending on today's date.
  async function setPublishAt(
    page: Page,
    monthNav: "Next month" | "Previous month",
    clicks: number,
  ) {
    await page.locator("#publishAt").click();
    for (let i = 0; i < clicks; i += 1) {
      await page.getByRole("button", { name: monthNav }).click();
    }
    await page.getByRole("button", { name: "15", exact: true }).click();
    await page.locator('input[type="time"]').fill("12:00");
    await page.keyboard.press("Escape");
  }

  test("a scheduled drop becomes visible only after publishAt passes", async ({ page }) => {
    await loginAs(page, OWNER_EMAIL);

    const title = `E2E Drop ${Date.now()}`;
    const slug = slugify(title);

    await page.goto("/admin/collections/new");
    await page.getByLabel("Title", { exact: true }).fill(title);
    await setPublishAt(page, "Next month", 1); // future
    await page.getByRole("button", { name: "Create collection" }).click();
    await expect(page).toHaveURL(/\/admin\/collections\/[^/]+$/);

    const beforeResponse = await page.goto(`/collections/${slug}`);
    expect(beforeResponse?.status()).toBe(404);

    await page.goto(`/admin/collections/${slug}`);
    await setPublishAt(page, "Previous month", 2); // from next month back to last month = past
    await page.getByRole("button", { name: "Save collection" }).click();
    await expect(page.getByText("Saved")).toBeVisible();

    const afterResponse = await page.goto(`/collections/${slug}`);
    expect(afterResponse?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  });
});
