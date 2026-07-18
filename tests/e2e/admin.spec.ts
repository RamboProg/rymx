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

async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
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

  test("owner creates a product with a variant and media, appears in /shop, and renders copy safely", async ({
    page,
  }) => {
    await loginAs(page, OWNER_EMAIL);

    const slug = `e2e-admin-tee-${Date.now()}`;
    const xssMarker = "<script>window.__xss = true;</script>";

    await page.goto("/admin/products/new");
    await page.getByLabel("Title", { exact: true }).fill("E2E Admin Tee");
    await page.getByLabel("Slug").fill(slug);
    await page.getByLabel("Description", { exact: true }).fill(xssMarker);
    await page.getByLabel("Status").selectOption("active");
    await page.getByLabel("Options").fill("Size: S, M");
    await page.getByRole("button", { name: "Create product" }).click();

    await expect(page).toHaveURL(new RegExp(`/admin/products/[^/]+$`));
    await expect(page.getByRole("heading", { name: "E2E Admin Tee" })).toBeVisible();

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
    await page.getByLabel("Stock").fill("10");
    await page.getByRole("button", { name: "Add variant" }).click();
    await expect(page.getByText("E2E-TEE-S")).toBeVisible();

    await page.goto(`/shop/${slug}`);
    await expect(page.getByRole("heading", { name: "E2E Admin Tee" })).toBeVisible();
    await expect(page.getByText("EGP 500.00")).toBeVisible();
    await expect(page.getByAltText("E2E Admin Tee")).toBeVisible();

    // The description contains a <script> tag; it must render as inert text,
    // never execute or get injected as a real element.
    await expect(page.getByText(xssMarker)).toBeVisible();
    const xssExecuted = await page.evaluate(() => (window as unknown as { __xss?: boolean }).__xss);
    expect(xssExecuted).toBeUndefined();
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
    await page.getByLabel("Slug").fill(`should-not-save-${Date.now()}`);
    await page.getByRole("button", { name: "Create product" }).click();

    await expect(page.getByText("Forbidden")).toBeVisible();
  });

  // datetime-local inputs only accept minute precision, so a publishAt just a
  // few seconds out is unreliable — it can truncate to the current (already
  // past) minute. Use dates far enough away that truncation can't matter, and
  // flip future -> past by editing the field rather than waiting for real
  // time to pass, which is deterministic instead of timing-dependent.
  function toDateTimeLocal(date: Date): string {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  test("a scheduled drop becomes visible only after publishAt passes", async ({ page }) => {
    await loginAs(page, OWNER_EMAIL);

    const slug = `e2e-drop-${Date.now()}`;
    const future = toDateTimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const past = toDateTimeLocal(new Date(Date.now() - 24 * 60 * 60 * 1000));

    await page.goto("/admin/collections/new");
    await page.getByLabel("Title", { exact: true }).fill("E2E Drop");
    await page.getByLabel("Slug").fill(slug);
    await page.getByLabel(/Publish at/).fill(future);
    await page.getByRole("button", { name: "Create collection" }).click();
    await expect(page).toHaveURL(/\/admin\/collections\/[^/]+$/);

    const beforeResponse = await page.goto(`/collections/${slug}`);
    expect(beforeResponse?.status()).toBe(404);

    await page.goto(`/admin/collections/${slug}`);
    await page.getByLabel(/Publish at/).fill(past);
    await page.getByRole("button", { name: "Save collection" }).click();
    await expect(page.getByText("Saved")).toBeVisible();

    const afterResponse = await page.goto(`/collections/${slug}`);
    expect(afterResponse?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "E2E Drop" })).toBeVisible();
  });
});
