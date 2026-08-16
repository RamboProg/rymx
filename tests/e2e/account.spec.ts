import { expect, test, type Page } from "@playwright/test";

// Requires the Firebase emulators running with seeded data (`pnpm seed`,
// which creates a fixed demo customer + a personal "VIP20" promo code
// assigned to them) and NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true. Places a
// real order as a side effect, so — like checkout.spec.ts — not safe to run
// twice against the same emulator session without reseeding.
const DEMO_EMAIL = "demo-customer@rymx.test";
const DEMO_PASSWORD = "password123";

async function loginAsDemoCustomer(page: Page) {
  await page.goto("/login");
  // The submit button is disabled until the form hydrates — waiting for it to be
  // enabled is a deterministic hydration signal, so the controlled inputs aren't
  // reset to empty after we fill them.
  const signIn = page.getByRole("button", { name: "Sign in" });
  await expect(signIn).toBeEnabled();
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await signIn.click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

test.describe("account", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Order-placing account flow runs once (chromium only) to avoid double-consuming seeded stock.",
    );
  });

  test("redirects an unauthenticated visitor away from /account", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
  });

  test("edits profile, adds/removes an address, and shows a personal promo", async ({ page }) => {
    await loginAsDemoCustomer(page);
    await page.goto("/account");

    await page.getByLabel("Name", { exact: true }).fill("Sara Updated");
    await page.getByLabel("Phone number").fill("01099998888");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Saved")).toBeVisible();
    await page.waitForTimeout(500);

    await page.reload();
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Sara Updated");
    await expect(page.getByLabel("Phone number")).toHaveValue("01099998888");

    await expect(page.getByText("VIP20")).toBeVisible();

    await page.getByLabel("Full name").fill("Sara Updated");
    await page.getByLabel("Phone", { exact: true }).fill("01012345678");
    await page.getByLabel("Governorate").fill("Cairo");
    await page.getByLabel("City").fill("Maadi");
    await page.getByLabel("Address").fill("12 Nile St.");
    await page.getByRole("button", { name: "Add address" }).click();
    await expect(page.getByText("12 Nile St., Maadi, Cairo")).toBeVisible();

    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("No saved addresses yet.")).toBeVisible();
  });

  test("shows a completed order in history and its detail", async ({ page }) => {
    await loginAsDemoCustomer(page);

    await page.goto("/shop/nile-tee");
    await page.getByRole("button", { name: "S", exact: true }).click();
    await page.getByRole("button", { name: "Add to cart" }).click();
    await page.goto("/checkout");
    await page.getByLabel("Full name").fill("Sara Ahmed");
    await page.getByLabel("Phone").fill("01012345678");
    await page.getByLabel("Governorate").fill("Cairo");
    await page.getByLabel("City").fill("Maadi");
    await page.getByLabel("Address").fill("12 Nile St.");
    await page.getByRole("button", { name: "Place order (COD)" }).click();
    await expect(page).toHaveURL(/\/checkout\/confirmation\?order=/);
    const orderId = new URL(page.url()).searchParams.get("order")!;

    await page.goto("/account/orders");
    // eslint-disable-next-line security/detect-non-literal-regexp -- orderId is a UUID this test just generated via checkout, not external input
    await expect(page.getByRole("link", { name: new RegExp(orderId) })).toBeVisible();

    // eslint-disable-next-line security/detect-non-literal-regexp -- see above
    await page.getByRole("link", { name: new RegExp(orderId) }).click();
    await expect(page).toHaveURL(`/account/orders/${orderId}`);
    await expect(page.getByRole("heading", { name: `Order #${orderId}` })).toBeVisible();
  });

  test("blocks viewing another customer's order (IDOR)", async ({ page, browser }) => {
    const otherCtx = await browser.newContext();
    const otherPage = await otherCtx.newPage();

    const otherEmail = `other-${Date.now()}@rymx.test`;
    await otherPage.goto("/register");
    const createAccount = otherPage.getByRole("button", { name: /create account/i });
    await expect(createAccount).toBeEnabled();
    await otherPage.getByLabel("Email").fill(otherEmail);
    await otherPage.getByLabel("Password", { exact: true }).fill("password123");
    await otherPage.getByLabel("Confirm password").fill("password123");
    await createAccount.click();
    await expect(otherPage.getByRole("button", { name: "Sign out" })).toBeVisible();

    await otherPage.goto("/shop/nile-tee");
    await otherPage.getByRole("button", { name: "M", exact: true }).click();
    await otherPage.getByRole("button", { name: "Add to cart" }).click();
    await otherPage.goto("/checkout");
    await otherPage.getByLabel("Full name").fill("Other Customer");
    await otherPage.getByLabel("Phone").fill("01000000000");
    await otherPage.getByLabel("Governorate").fill("Giza");
    await otherPage.getByLabel("City").fill("Dokki");
    await otherPage.getByLabel("Address").fill("1 Test St.");
    await otherPage.getByRole("button", { name: "Place order (COD)" }).click();
    await expect(otherPage).toHaveURL(/\/checkout\/confirmation\?order=/);
    const otherOrderId = new URL(otherPage.url()).searchParams.get("order")!;
    await otherCtx.close();

    await loginAsDemoCustomer(page);
    const response = await page.goto(`/account/orders/${otherOrderId}`);
    expect(response?.status()).toBe(404);
  });
});
