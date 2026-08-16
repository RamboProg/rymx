import { expect, test, type Page } from "@playwright/test";

// Requires the Firebase emulators + seed (demo-owner@rymx.test, owner) and
// NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true. Verifies the admin-only EN/AR
// localization: the language toggle, RTL layout under Arabic, cookie
// persistence, and that the public site is never affected.
const OWNER_EMAIL = "demo-owner@rymx.test";
const PASSWORD = "password123";

async function loginAsOwner(page: Page) {
  await page.goto("/login");
  // The submit button is disabled until the form hydrates — waiting for it to be
  // enabled is a deterministic "React is wired up" signal, so the controlled
  // inputs won't be reset to empty on hydration after we fill them.
  const signIn = page.getByRole("button", { name: "Sign in" });
  await expect(signIn).toBeEnabled();
  await page.getByLabel("Email").fill(OWNER_EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await signIn.click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible({ timeout: 15000 });
}

test.describe("admin localization", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Locale cookie flow runs once (chromium only).",
    );
  });

  test("toggles admin between English (LTR) and Arabic (RTL) and persists", async ({ page }) => {
    await loginAsOwner(page);
    await page.goto("/admin");

    const adminRegion = page.locator("[dir]").first();
    const nav = page.getByRole("navigation", { name: /Admin|الإدارة/ });

    // Default: English, left-to-right.
    await expect(adminRegion).toHaveAttribute("dir", "ltr");
    await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();

    // Switch to Arabic.
    await page.getByRole("button", { name: "ع" }).click();
    await expect(adminRegion).toHaveAttribute("dir", "rtl");
    await expect(nav.getByRole("link", { name: "لوحة التحكم" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "لوحة التحكم" })).toBeVisible();

    // The choice survives a reload (cookie-backed, no URL change).
    await page.reload();
    await expect(page.locator("[dir]").first()).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1, name: "لوحة التحكم" })).toBeVisible();

    // Switch back to English.
    await page.getByRole("button", { name: "EN" }).click();
    await expect(page.locator("[dir]").first()).toHaveAttribute("dir", "ltr");
  });

  test("localizes product-form field labels and helper descriptions in Arabic", async ({
    page,
  }) => {
    await loginAsOwner(page);
    await page.goto("/admin");
    await page.getByRole("button", { name: "ع" }).click();
    await expect(page.locator("[dir]").first()).toHaveAttribute("dir", "rtl");

    await page.goto("/admin/products/new");
    await expect(page.getByText("اسم المنتج الظاهر للعملاء.")).toBeVisible();
    await expect(page.getByText("مطلوبة. تُجمَّع المنتجات حسب الفئة في المتجر.")).toBeVisible();
    await expect(page.getByRole("button", { name: "إنشاء المنتج" })).toBeVisible();

    // Reset locale so other specs see English.
    await page.getByRole("button", { name: "EN" }).click();
  });

  test("public shop stays English even when the admin locale is Arabic", async ({ page }) => {
    await loginAsOwner(page);
    await page.goto("/admin");
    await page.getByRole("button", { name: "ع" }).click();
    await expect(page.locator("[dir]").first()).toHaveAttribute("dir", "rtl");

    await page.goto("/shop");
    await expect(page.getByRole("heading", { level: 1, name: "Shop" })).toBeVisible();

    await page.goto("/admin");
    await page.getByRole("button", { name: "EN" }).click();
  });
});
