import { expect, test } from "@playwright/test";

// Requires the Firebase Auth emulator running and NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true
// (see package.json's test:e2e wiring in CI, which runs this under `firebase emulators:exec`).
test.describe("auth", () => {
  test("redirects an unauthenticated visitor away from /admin", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("register, log out, and log back in", async ({ page }) => {
    const email = `test-${Date.now()}@rymx.test`;
    const password = "password123";

    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });
});
