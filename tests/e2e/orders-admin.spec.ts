import { expect, test, type Page } from "@playwright/test";

// Requires the Firebase emulators running with seeded data (`pnpm seed`) and
// NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true. Places a real order and mutates
// real (emulator) stock/discount docs, so — like checkout.spec.ts — not safe
// to run twice against the same emulator session without reseeding.
const OWNER_EMAIL = "demo-owner@rymx.test";
const DEMO_CUSTOMER_EMAIL = "demo-customer@rymx.test";
const PASSWORD = "password123";
const AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";

async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  // The submit button is disabled until the form hydrates — waiting for it to be
  // enabled is a deterministic hydration signal, so the controlled inputs aren't
  // reset to empty after we fill them.
  const signIn = page.getByRole("button", { name: "Sign in" });
  await expect(signIn).toBeEnabled();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await signIn.click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

// The Auth emulator's REST sign-in endpoint returns the account's uid
// (localId) directly. Used only to look up the seeded demo customer's uid
// for assigning a personal promo code — there's no admin customer directory
// yet (that's Phase 8), and uids aren't otherwise deterministic since the
// seed script calls createUser() without an explicit uid.
async function getUidByPassword(email: string, password: string): Promise<string> {
  const res = await fetch(
    `http://${AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const data = (await res.json()) as { localId: string };
  return data.localId;
}

async function addToCart(page: Page, slug: string, optionValues: string[]) {
  await page.goto(`/shop/${slug}`);
  for (const value of optionValues) {
    await page.getByRole("button", { name: value, exact: true }).click();
  }
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("button", { name: "Added to cart" })).toBeVisible();
}

async function fillShipping(page: Page, email?: string) {
  if (email) await page.getByLabel("Email").fill(email);
  await page.getByLabel("Full name").fill("Sara Ahmed");
  await page.getByLabel("Phone").fill("01012345678");
  await page.getByLabel("Governorate").fill("Cairo");
  await page.getByLabel("City").fill("Maadi");
  await page.getByLabel("Address").fill("12 Nile St.");
}

// Inventory table columns are Product, SKU, Options, Stock, Adjust — the
// Stock cell can carry a trailing "Low" badge, hence the strip below.
async function getStock(page: Page, sku: string): Promise<number> {
  const row = page.getByRole("row").filter({ hasText: sku });
  const text = (await row.locator("td").nth(3).textContent()) ?? "0";
  return parseInt(text.replace("Low", ""), 10);
}

test.describe("order fulfillment & returns (admin)", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Stock-mutating admin flow runs once (chromium only) to avoid double-consuming seeded stock.",
    );
  });

  test("owner fulfills an order into a shipment with tracking, delivers it, then a return restocks inventory", async ({
    page,
  }) => {
    await addToCart(page, "desert-cargo-pants", ["30", "Black"]);
    await page.goto("/checkout");
    await fillShipping(page, `fulfillment-${Date.now()}@rymx.test`);
    await page.getByRole("button", { name: "Place order (COD)" }).click();
    await expect(page).toHaveURL(/\/checkout\/confirmation\?order=/);
    const orderId = new URL(page.url()).searchParams.get("order")!;

    await loginAs(page, OWNER_EMAIL);
    await page.goto(`/admin/orders/${orderId}`);
    await expect(page.getByText("Pending", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Confirm order" }).click();
    await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();

    await page.getByRole("spinbutton").first().fill("1");
    await page.getByRole("button", { name: "Create shipment" }).click();
    await expect(page.getByText("pending", { exact: true })).toBeVisible();

    await page.getByLabel("Carrier").fill("Bosta");
    await page.getByLabel("Tracking number").fill("BOSTA-E2E-1");
    await page.getByRole("button", { name: "Mark shipped" }).click();
    // The order status panel is a sibling client component that only updates
    // via an explicit router.refresh() from this action — asserting it here
    // (no page.reload()) is regression coverage for that fix.
    await expect(page.getByText("Shipped", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Mark delivered" }).click();
    await expect(page.getByText("Delivered", { exact: true })).toBeVisible();

    await page.goto("/admin/inventory");
    const stockBeforeReturn = await getStock(page, "DCP-30-BLACK");

    await page.goto(`/admin/orders/${orderId}`);
    await page.getByRole("spinbutton").first().fill("1");
    // Reason is a Radix Select (labelled "Reason for <item>"), not a text input.
    await page.getByLabel(/Reason for/).click();
    await page.getByRole("option", { name: "Wrong size", exact: true }).click();
    await page.getByLabel("Refund amount (EGP)").fill("1950");
    await page.getByRole("button", { name: "Log return" }).click();
    await expect(page.getByText("requested", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("approved", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Restock & record refund" }).click();
    await expect(page.getByText("restocked", { exact: true })).toBeVisible();

    await page.goto("/admin/inventory");
    const stockAfterReturn = await getStock(page, "DCP-30-BLACK");
    expect(stockAfterReturn).toBe(stockBeforeReturn + 1);
    // Scoped to this SKU (unique to this test in the whole suite) and the
    // most recent matching row, since "Recent adjustments" isn't reset
    // between local reseeds and can carry rows from earlier manual runs.
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: "DCP-30-BLACK" })
        .filter({ hasText: "restocked" })
        .first(),
    ).toBeVisible();
  });

  test("owner issues a per-user promo code and only the assigned customer can redeem it", async ({
    page,
    browser,
  }) => {
    const targetUid = await getUidByPassword(DEMO_CUSTOMER_EMAIL, PASSWORD);
    const code = `E2EPERSONAL${Date.now()}`;

    await loginAs(page, OWNER_EMAIL);
    await page.goto("/admin/discounts/new");
    await page.getByLabel("Code", { exact: true }).fill(code);
    await page.getByLabel("Value (%)").fill("15");
    await page.getByLabel(/Assign to customer uid/).fill(targetUid);
    await page.getByRole("button", { name: "Create discount" }).click();
    // eslint-disable-next-line security/detect-non-literal-regexp -- code is a test-generated string, not external input
    await expect(page).toHaveURL(new RegExp(`/admin/discounts/${code}$`));

    // A different, freshly-registered customer must be refused.
    const otherCtx = await browser.newContext();
    const otherPage = await otherCtx.newPage();
    const otherEmail = `other-personal-${Date.now()}@rymx.test`;
    await otherPage.goto("/register");
    await otherPage.getByLabel("Email").fill(otherEmail);
    await otherPage.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await otherPage.getByLabel("Confirm password").fill(PASSWORD);
    await otherPage.getByRole("button", { name: /create account/i }).click();
    await expect(otherPage.getByRole("button", { name: "Sign out" })).toBeVisible();

    await addToCart(otherPage, "nile-tee", ["M"]);
    await otherPage.goto("/checkout");
    await otherPage.getByLabel("Promo code").fill(code);
    await otherPage.getByRole("button", { name: "Apply" }).click();
    await expect(
      otherPage.getByText("This promo code was issued to a different customer."),
    ).toBeVisible();
    await otherCtx.close();

    // The assigned customer redeems it successfully.
    const customerCtx = await browser.newContext();
    const customerPage = await customerCtx.newPage();
    await loginAs(customerPage, DEMO_CUSTOMER_EMAIL);
    await addToCart(customerPage, "nile-tee", ["L"]);
    await customerPage.goto("/checkout");
    await customerPage.getByLabel("Promo code").fill(code);
    await customerPage.getByRole("button", { name: "Apply" }).click();
    await expect(customerPage.getByText(`Code ${code} applied`)).toBeVisible();
    await customerCtx.close();
  });
});
