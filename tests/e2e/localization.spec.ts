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

  test("public shop follows the same locale as the admin area", async ({ page }) => {
    await loginAsOwner(page);
    await page.goto("/admin");
    await page.getByRole("button", { name: "ع" }).click();
    await expect(page.locator("[dir]").first()).toHaveAttribute("dir", "rtl");

    // Public pages now share the same locale cookie as admin — switching in
    // one place localizes the whole site.
    await page.goto("/shop");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1, name: "المتجر" })).toBeVisible();

    await page.getByRole("button", { name: "EN" }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.getByRole("heading", { level: 1, name: "Shop" })).toBeVisible();
  });
});

// The verify-email page (src/app/(auth)/verify-email/page.tsx) reuses the
// same locale cookie + LocaleToggle as the admin area, extended to a public
// route for the first time — separate suite since it needs its own
// (non-owner) signed-in customer, not the seeded admin fixture above.
test.describe("verify-email localization", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Locale cookie flow runs once (chromium only).",
    );
  });

  test("toggles the verify-email page between English and Arabic (RTL) and persists", async ({
    page,
  }) => {
    const email = `test-locale-${Date.now()}@rymx.test`;
    const password = "password123";

    await page.goto("/register");
    const createAccount = page.getByRole("button", { name: /create account/i });
    await expect(createAccount).toBeEnabled();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await createAccount.click();
    await expect(page).toHaveURL(/\/verify-email/);

    await expect(page.locator("[dir]").first()).toHaveAttribute("dir", "ltr");
    await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();

    await page.getByRole("button", { name: "ع" }).click();
    await expect(page.locator("[dir]").first()).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: "تحقق من بريدك الإلكتروني" })).toBeVisible();

    // Persists across reload (cookie-backed, same mechanism as admin).
    await page.reload();
    await expect(page.locator("[dir]").first()).toHaveAttribute("dir", "rtl");

    await page.getByRole("button", { name: "EN" }).click();
    await expect(page.locator("[dir]").first()).toHaveAttribute("dir", "ltr");
  });
});
