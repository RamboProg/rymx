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
    // The submit is disabled until the form hydrates — waiting for it to be
    // enabled guarantees React is wired up, so filling won't be reset on
    // hydration and a native (credential-leaking) submit can't fire.
    const createAccount = page.getByRole("button", { name: /create account/i });
    await expect(createAccount).toBeEnabled();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await createAccount.click();

    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

    // Sign out redirects to the landing page (where the header — and its Sign in
    // link — is deliberately hidden), so assert the logout by URL + absence of
    // the signed-in control rather than by the hidden link.
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/");
    await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);

    await page.goto("/login");
    const signIn = page.getByRole("button", { name: "Sign in" });
    await expect(signIn).toBeEnabled();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await signIn.click();

    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });
});
