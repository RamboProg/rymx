import { expect, test } from "@playwright/test";

// CI's e2e job runs Playwright against a real deployed Vercel preview (see
// .github/workflows/ci.yml) — a real Firebase project, not the local
// emulator. Locally, point NEXT_PUBLIC_USE_FIREBASE_EMULATORS at whichever
// project `pnpm exec next start` is actually serving.
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

    // Register no longer bounces straight into /account — it lands on the
    // verify-email interstitial first (see RegisterForm + VerifyEmailView).
    await expect(page).toHaveURL(/\/verify-email/);
    await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
    await expect(page.getByText(/spam or junk folder/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

    // Not gated: the account area is reachable immediately, just nagged.
    await page.getByRole("link", { name: "Continue to your account" }).click();
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByText(/Verify your email — check your inbox/i)).toBeVisible();

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

  test("verify-email resend goes into cooldown after one click", async ({ page }) => {
    const email = `test-resend-${Date.now()}@rymx.test`;
    const password = "password123";

    await page.goto("/register");
    const createAccount = page.getByRole("button", { name: /create account/i });
    await expect(createAccount).toBeEnabled();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await createAccount.click();
    await expect(page).toHaveURL(/\/verify-email/);

    const resend = page.getByRole("button", { name: "Resend email" });
    await expect(resend).toBeEnabled();
    await resend.click();

    await expect(page.getByText("Email sent")).toBeVisible();
    await expect(page.getByRole("button", { name: /You can resend in \d+s/ })).toBeDisabled();
  });

  // Google sign-in/sign-up (LoginForm.tsx / RegisterForm.tsx) isn't covered
  // here: CI's e2e job runs against a real deployed preview (see
  // .github/workflows/ci.yml), not the local Firebase Auth emulator, so
  // there's no way to script Google's real OAuth consent screen headlessly.
  // Verify manually per the plan's Verification section instead.
});
